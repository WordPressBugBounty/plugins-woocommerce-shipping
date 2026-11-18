<?php

namespace WooCommerce\BoxPacker\DVDoug;

use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\InfalliblePacker;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\ItemList;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\PackedBoxList;
use Exception;
use WooCommerce\BoxPacker\Abstract_Packer;
use WooCommerce\BoxPacker\Package;

class Packer extends Abstract_Packer {

	/**
	 * Default for the `woocommerce_box_packer_max_volume` filter: the most total item volume one
	 * pack() call accepts, in mm³ (1,000,000 m³).
	 */
	const MAX_VOLUME = 1e15;

	/**
	 * The volume limit can't be filtered above this. dvdoug sums item volumes as an int, so a total
	 * near PHP_INT_MAX (about 9.2e18 mm³) throws a TypeError that the catch in pack() doesn't stop.
	 */
	const MAX_VOLUME_CEILING = 1e18;

	/**
	 * @param string $dimension_unit
	 * @param string $weight_unit
	 * @param array $options
	 */
	public function __construct( string $dimension_unit, string $weight_unit, array $options = array() ) {
		parent::__construct( $dimension_unit, $weight_unit, $options );
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
	 * @param int              $qty Item quantity.
	 *
	 * @return void
	 */
	public function add_item( $length, $width, $height, $weight, $value = '', $meta = array(), $qty = 1 ) {
		$this->items[] = array(
			'data' => new Item( $this->dimension_unit, $this->weight_unit, $length, $width, $height, $weight, $value, $meta ),
			'qty'  => $qty,
		);
	}

	/**
	 * @param $length
	 * @param $width
	 * @param $height
	 * @param int $weight
	 * @param float $max_weight
	 * @param string $type
	 *
	 * @return \WooCommerce\BoxPacker\DVDoug\Box
	 */
	public function add_box( $length, $width, $height, $weight = 0, $max_weight = 0.0, $type = '' ) {
		$box           = new Box( $this->dimension_unit, $this->weight_unit, $length, $width, $height, $weight, $max_weight, $type );
		$this->boxes[] = $box;

		return $box;
	}

	/**
	 * @return void
	 */
	public function pack() {

		try {
			// Set the $packages property to an empty array.
			$this->clear_packages();

			// No items means no packages. This is not an error: a shipping method can skip every item.
			if ( empty( $this->items ) ) {
				return;
			}

			// Refuse carts too large to pack in a few seconds, before any packing work runs.
			$this->check_cart_size();

			/**
			 * If there are no boxes, add a box that is not possible
			 * to pack so the packer can still loop through the items
			 * and handle them as unpacked.
			 */
			if ( empty( $this->boxes ) ) {
				$unpackable_box = $this->add_box( 0, 0, 0, 0, 0 );
				$unpackable_box->set_id( 'unpackable box' );
				$unpackable_box->set_inner_dimensions( 0, 0, 0 );
				$unpackable_box->set_volume( 0 );

				$this->boxes = array( $unpackable_box );
			}

			// Order the boxes by volume.
			$this->boxes = $this->order_boxes( $this->boxes );

			if ( $this->can_use_fast_path() && $this->pack_homogeneous() ) {
				return;
			}

			/*
			 * Instantiate DVDoug InfalliblePacker
			 *
			 * @see https://boxpacker.io/en/stable/too-large-items.html
			 */
			$packer = new InfalliblePacker();

			/**
			 * Disable using multiple boxes just to
			 * balance the weight, for now. Could be
			 * a good optional future feature.
			 *
			 * @see https://boxpacker.io/en/stable/weight-distribution.html
			 */
			$packer->setMaxBoxesToBalanceWeight( 0 );

			// Add box sizes to packer.
			foreach ( $this->boxes as $box ) {
				$packer->addBox( $box );
			}

			// Add items to packer.
			foreach ( $this->items as $item ) {
				$packer->addItem( $item['data'], $item['qty'] );
			}

			/**
			 * Attempt to pack items into boxes and handle
			 * the packed boxes.
			 */
			$packed_box_list = $packer->pack();
			$this->handle_packed_box_list( $packed_box_list );

			/**
			 * Check for any unpacked items,
			 * then handle them.
			 *
			 * @see https://boxpacker.io/en/stable/too-large-items.html
			 */
			$unpacked_item_list = $packer->getUnpackedItems();
			$this->handle_unpacked_item_list( $unpacked_item_list );
		} catch ( Exception $e ) {

			$this->maybe_display_packing_error( $e->getMessage() );
		}
	}

	/**
	 * Whether pack() tries the fast path: one item line, on PHP 8+.
	 *
	 * PHP 7's usort is not stable. dvdoug's orientation choice then depends on its static look-ahead
	 * cache, which remembers earlier iterations, so the fast path cannot replay them exactly there.
	 * PHP 7 still gets the run-length item list from the dvdoug patch.
	 *
	 * @return bool
	 */
	private function can_use_fast_path(): bool {
		return PHP_VERSION_ID >= 80000 && 1 === count( $this->items );
	}

	/**
	 * Throw when the cart's total unit count or total item volume is over its limit.
	 *
	 * Both totals are summed as floats, so this check can't overflow itself.
	 *
	 * @throws Exception When a total is over its limit.
	 */
	private function check_cart_size() {
		$units  = 0.0;
		$volume = 0.0;
		foreach ( $this->items as $item ) {
			$qty     = max( 0.0, (float) $item['qty'] );
			$units  += $qty;
			$volume += $qty * $item['data']->getWidth() * $item['data']->getLength() * $item['data']->getDepth();
		}

		$this->check_unit_count( $units, $this->can_use_fast_path() );

		/**
		 * Filters the most total item volume, in mm³, one Accurate Packer pack() call accepts. Over
		 * it, nothing is packed. Values above 1e18 are capped at 1e18. A value that is not a number
		 * above 0 keeps the default.
		 *
		 * @since 1.4.1
		 *
		 * @param float  $max_volume Default 1e15 (1,000,000 m³).
		 * @param Packer $packer     The packer.
		 */
		$max_volume = apply_filters( 'woocommerce_box_packer_max_volume', self::MAX_VOLUME, $this );
		$max_volume = is_numeric( $max_volume ) && $max_volume > 0 ? min( (float) $max_volume, self::MAX_VOLUME_CEILING ) : self::MAX_VOLUME;
		if ( $volume > $max_volume ) {
			throw new Exception( sprintf( 'Items too large to pack: %s mm³ in total, the limit is %s mm³.', number_format( $volume ), number_format( $max_volume ) ) );
		}
	}

	/**
	 * Fast path for one item line with a large quantity.
	 *
	 * While more than C items remain (C = the most any box takes), every box is full to its own
	 * capacity, so each doVolumePacking() iteration packs the same C items. Only the tie-break can
	 * change, because Packer::getBoxList() moves boxes with volume >= remaining item volume first.
	 * So pack every box once with a small list, let dvdoug pick the box for each iteration from
	 * those results, and pack the last 1..C items with the normal packer.
	 *
	 * @return bool False when the normal path must run instead.
	 */
	private function pack_homogeneous(): bool {
		$item = $this->items[0]['data'];
		$qty  = (int) $this->items[0]['qty'];
		// Upper bound on what any box can take (volume and weight), so the first probe is usually big enough.
		$item_volume = $item->getWidth() * $item->getLength() * $item->getDepth();
		$upper_bound = 0;
		foreach ( $this->boxes as $box ) {
			$bound = $item_volume > 0 ? intdiv( $box->getInnerWidth() * $box->getInnerLength() * $box->getInnerDepth(), $item_volume ) : PHP_INT_MAX;
			if ( $item->getWeight() > 0 ) {
				$bound = min( $bound, intdiv( max( 0, $box->getMaxWeight() - $box->getEmptyWeight() ), $item->getWeight() ) );
			}
			$upper_bound = max( $upper_bound, $bound );
		}
		// No volume and no weight: every box takes every unit, so the normal path packs one box.
		if ( PHP_INT_MAX === $upper_bound ) {
			return false;
		}
		$probe_size = $upper_bound < PHP_INT_MAX / 4 ? max( 64, 2 * $upper_bound + 16 ) : 64;

		while ( true ) {
			if ( $probe_size >= $qty ) {
				return false;
			}
			$probe = $this->new_dvdoug_packer();
			$probe->addItem( $item, $probe_size );
			$results = $probe->pack_each_box();
			if ( ! $results ) {
				return false; // Fits no box: the normal path moves everything to unpacked cheaply.
			}
			$per_box = 0;
			foreach ( $results as $result ) {
				$per_box = max( $per_box, $result->getItems()->count() );
			}
			// Probe list must be well past every box's capacity (the orientation look-ahead reads 8 items).
			if ( 2 * $per_box + 16 <= $probe_size ) {
				break;
			}
			$probe_size *= 4;
		}

		$replay    = $this->new_dvdoug_packer();
		$remaining = $qty;
		$packed    = array();
		while ( $remaining > $per_box ) {
			$best       = $replay->best_box( $item, $remaining, $results );
			$packed[]   = $best;
			$remaining -= $best->getItems()->count();
		}

		$tail = $this->new_dvdoug_packer();
		$tail->addItem( $item, $remaining );
		$tail_list = $tail->pack();

		$packed_box_list = new PackedBoxList();
		$packed_box_list->insertFromArray( array_merge( $packed, Probe_Packer::insertion_order( $tail_list ) ) );

		$this->handle_packed_box_list( $packed_box_list );
		$this->handle_unpacked_item_list( $tail->getUnpackedItems() );

		return true;
	}

	private function new_dvdoug_packer(): Probe_Packer {
		$packer = new Probe_Packer();
		$packer->setMaxBoxesToBalanceWeight( 0 );
		foreach ( $this->boxes as $box ) {
			$packer->addBox( $box );
		}

		return $packer;
	}

	/**
	 * Loop through DVDoug's PackedBoxList and
	 * convert the objects to an array of
	 * WooCommerce/BoxPacker/Package objects
	 * and add them to the packages[] property.
	 *
	 * @param \WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\PackedBoxList $packed_box_list
	 *
	 * @return void
	 */
	private function handle_packed_box_list( PackedBoxList $packed_box_list ) {

		if ( empty( $packed_box_list ) ) {
			return;
		}

		foreach ( $packed_box_list as $packed_box ) {
			$box = $packed_box->getBox();

			$packed_items  = array();
			$packed_volume = 0;
			$packed_value  = 0;
			foreach ( $packed_box->getItems() as $item ) {
				$item           = $item->getItem();
				$packed_items[] = $item;
				$packed_volume  += $item->get_volume();
				$packed_value   += $item->get_value();
			}

			$converted_weight = wc_get_weight( $packed_box->getWeight(), $this->weight_unit, 'g' );

			$this->packages[] = new Package( $box->getReference(), $box->get_type(), $converted_weight, $packed_volume, $box->get_outer_length(), $box->get_outer_width(), $box->get_outer_height(), $packed_value, array(), $packed_items );
		}
	}

	/**
	 * Check if unpacked items exist,
	 * then loop through and handle them.
	 *
	 * @param \WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\ItemList $unpacked_item_list
	 *
	 * @return void
	 */
	private function handle_unpacked_item_list( ItemList $unpacked_item_list ) {
		if ( ! empty( $unpacked_item_list ) ) {
			foreach ( $unpacked_item_list as $item ) {
				$this->handle_unpacked_item( $item );
			}
		}
	}

}