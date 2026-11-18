<?php

namespace WooCommerce\BoxPacker\Original;

use Exception;
use WooCommerce\BoxPacker\Abstract_Packer;

class Packer extends Abstract_Packer {

	/**
	 * @var Item|null The item that filled the last iteration, when it can be repeated. See repeat_iterations().
	 */
	private $homogeneous_item = null;

	/**
	 * @var float Units added since the items were last packed or cleared, including any not stored.
	 */
	private $unit_count = 0.0;

	/**
	 * @var int Lines added since the items were last packed or cleared.
	 */
	private $line_count = 0;

	/**
	 * @return void
	 */
	public function clear_items() {
		parent::clear_items();
		$this->unit_count = 0.0;
		$this->line_count = 0;
	}

	/**
	 * Add Item to items property.
	 *
	 * @param int|float|string $length Item Length.
	 * @param int|float|string $width Item width.
	 * @param int|float|string $height Item height.
	 * @param int|float|string $weight Item weight.
	 * @param int|float|string $value Item price.
	 * @param array            $meta Item metadata.
	 * @param int|float|string $qty Item quantity.
	 *
	 * @return void
	 */
	public function add_item( $length, $width, $height, $weight, $value = '', $meta = array(), $qty = 1 ) {
		// Nothing to add, and a line with no quantity may also have no dimensions.
		if ( $qty <= 0 ) {
			return;
		}
		$this->unit_count += (float) $qty;
		$this->line_count++;
		// The Speed Packer stores one entry per unit, so stop storing once the cart is over every
		// limit; pack() then refuses it.
		if ( $this->unit_count > max( $this->get_max_units( true ), $this->get_max_units( false ) ) ) {
			return;
		}
		// Items are never modified, so every unit can share one object (the dvdoug packer does the same).
		$item = new Item( $length, $width, $height, $weight, $value, $meta );
		for ( $i = 0; $i < $qty; $i++ ) {
			$this->items[] = $item;
		}
	}

	/**
	 * add_box function.
	 *
	 * @param mixed $length
	 * @param mixed $width
	 * @param mixed $height
	 * @param mixed $weight
	 * @param float $max_weight
	 * @param string $type
	 *
	 * @return \WooCommerce\BoxPacker\Original\Box
	 */
	public function add_box( $length, $width, $height, $weight = 0, $max_weight = 0.0, $type = '' ) {
		$new_box       = new Box( $length, $width, $height, $weight, $max_weight, $type );
		$this->boxes[] = $new_box;

		return $new_box;
	}

	/**
	 * pack function.
	 *
	 * @return void
	 */
	public function pack() {
		try {
			// pack() uses up the items, so the next cart counts from 0. One line takes the fast path.
			$units            = $this->unit_count;
			$fast_path        = 1 === $this->line_count;
			$this->unit_count = 0.0;
			$this->line_count = 0;
			try {
				// Before the items check: add_item() stores nothing for a cart over every limit.
				$this->check_unit_count( $units, $fast_path );
			} catch ( Exception $e ) {
				$this->items    = array();
				$this->packages = array();
				throw $e;
			}

			// No items means no packages. This is not an error: a shipping method can skip every item.
			if ( ! is_array( $this->items ) ) {
				$this->packages = array();

				return;
			}

			// Clear packages
			$this->packages         = array();
			$this->homogeneous_item = null;

			// Order the boxes by volume
			$this->boxes = $this->order_boxes( $this->boxes );

			if ( ! $this->boxes ) {
				$this->cannot_pack = $this->items;
				$this->items       = array();
			}

			// Removing packed items keeps the order, so with a stable sort (PHP 8+) one sort is enough.
			// PHP 7.4's sort is not stable, so there the items are still re-sorted for every box.
			$sort_once = PHP_VERSION_ID >= 80000;
			if ( $sort_once ) {
				$this->items = $this->order_items( $this->items );
			}

			// Keep looping until packed
			while ( sizeof( $this->items ) > 0 ) {
				if ( ! $sort_once ) {
					$this->items = $this->order_items( $this->items );
				}
				$possible_packages = array();
				$best_package      = '';

				// Attempt to pack all items in each box
				foreach ( $this->boxes as $box ) {
					$possible_packages[] = $box->pack( $this->items );
				}

				// Find the best success rate
				$best_percent = 0;

				foreach ( $possible_packages as $package ) {
					if ( $package->percent > $best_percent ) {
						$best_percent = $package->percent;
					}
				}

				if ( $best_percent == 0 ) {
					$this->cannot_pack = $this->items;
					$this->items       = array();
				} else {
					// Get smallest box with best_percent
					$possible_packages = array_reverse( $possible_packages );

					foreach ( $possible_packages as $package ) {
						if ( $package->percent == $best_percent ) {
							$best_package = $package;
							break; // Done packing
						}
					}

					// Update items array
					$this->items = $best_package->unpacked;

					// Store package
					$this->packages[] = $best_package;

					$this->repeat_iterations( array_reverse( $possible_packages ) );
				}
			}

			// Items we cannot pack (by now) get packaged individually
			if ( $this->cannot_pack ) {
				foreach ( $this->cannot_pack as $item ) {
					$this->handle_unpacked_item( $item );
				}
			}
		} catch ( Exception $e ) {

			$this->maybe_display_packing_error( $e->getMessage() );
		}
	}

	/**
	 * Homogeneous fast path. If every remaining item is the same object and more remain than any
	 * box took in the iteration just done, every box will again fill to the same count, weight,
	 * volume and value. Only `percent` changes, because its denominators include the leftover
	 * items. The leftover sums are repeated additions of one value, so they are replayed with
	 * prefix sums, and the winner is chosen with the same comparisons as pack().
	 *
	 * The first iteration over these items is never the one repeated. A packet keeps the dimensions
	 * of an item it could not take (maybe_packed_*) until its next pack() call, so the first
	 * iteration can start from what an earlier, mixed iteration left. Every later one starts from
	 * what an iteration over these items left, so they all pack the same.
	 *
	 * @param Package[] $candidates This iteration's packages, in $this->boxes order.
	 */
	private function repeat_iterations( array $candidates ) {
		$item                   = $this->homogeneous_item_of( $candidates );
		$first                  = $item !== $this->homogeneous_item;
		$this->homogeneous_item = $item;
		if ( null === $item || $first ) {
			return;
		}

		$remaining = count( $this->items );
		$max_box   = 0;
		foreach ( $candidates as $candidate ) {
			$max_box = max( $max_box, count( $candidate->packed ) );
		}

		// Box::make_package() sums the leftover list from 0, one item at a time.
		$item_weight = $item->get_weight();
		$item_volume = $item->get_volume();
		$sum_weight  = array( 0 );
		$sum_volume  = array( 0 );
		$running_w   = 0;
		$running_v   = 0;
		for ( $k = 1; $k <= $remaining; $k++ ) {
			$running_w       += $item_weight;
			$running_v       += $item_volume;
			$sum_weight[ $k ] = $running_w;
			$sum_volume[ $k ] = $running_v;
		}

		$boxes  = array_values( $this->boxes );
		$shared = (object) array( 'items' => $this->items );
		while ( $remaining > $max_box ) {
			$percents     = array();
			$best_percent = 0;
			foreach ( $candidates as $i => $candidate ) {
				$packed_count   = count( $candidate->packed );
				$unpacked_count = $remaining - $packed_count;
				$percents[ $i ] = Box::success_percent( $candidate->weight - $boxes[ $i ]->get_weight(), $candidate->volume, $sum_weight[ $unpacked_count ], $sum_volume[ $unpacked_count ], $packed_count, $unpacked_count );
				if ( $percents[ $i ] > $best_percent ) {
					$best_percent = $percents[ $i ];
				}
			}
			if ( $best_percent == 0 ) {
				break; // Let pack() handle it.
			}
			// Smallest box with best_percent: the last match in $this->boxes order.
			for ( $i = count( $candidates ) - 1; $percents[ $i ] != $best_percent; $i-- ) {
			}

			$remaining       -= count( $candidates[ $i ]->packed );
			$copy             = clone $candidates[ $i ];
			$copy->percent    = $percents[ $i ];
			$copy->set_unpacked_prefix( $shared, $remaining );
			$this->packages[] = $copy;
		}
		$this->items = array_slice( $this->items, 0, $remaining );
	}

	/**
	 * The item this iteration packed and left, when it is the only one and more of it remain than
	 * any box took. The iteration's input was then also only this item.
	 *
	 * @param Package[] $candidates This iteration's packages.
	 *
	 * @return Item|null
	 */
	private function homogeneous_item_of( array $candidates ) {
		$remaining = count( $this->items );
		if ( 0 === $remaining ) {
			return null;
		}
		$item    = reset( $this->items );
		$max_box = 0;
		foreach ( $candidates as $candidate ) {
			$max_box = max( $max_box, count( $candidate->packed ) );
			foreach ( $candidate->packed as $packed_item ) {
				if ( $packed_item !== $item ) {
					return null;
				}
			}
		}
		if ( $max_box < 1 || $remaining <= $max_box ) {
			return null;
		}
		foreach ( $this->items as $unpacked_item ) {
			if ( $unpacked_item !== $item ) {
				return null;
			}
		}

		return $item;
	}
}
