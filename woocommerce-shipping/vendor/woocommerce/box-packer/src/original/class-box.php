<?php

namespace WooCommerce\BoxPacker\Original;

use WooCommerce\BoxPacker\Package;

/**
 * WC_Boxpack_Box class.
 */
class Box implements \WooCommerce\BoxPacker\Box {

	/**
	 * @var string ID of the box - given to packages
	 */
	private $id = '';
	/**
	 * @var float Weight of the box itself
	 */
	private $weight;
	/**
	 * @var float Max allowed weight of box + contents
	 */
	private $max_weight;
	/**
	 * @var float Outer dimension of box sent to shipper
	 */
	private $outer_height;
	/**
	 * @var float Outer dimension of box sent to shipper
	 */
	private $outer_width;
	/**
	 * @var float Outer dimension of box sent to shipper
	 */
	private $outer_length;
	/**
	 * @var float Inner dimension of box used when packing
	 */
	private $height;
	/**
	 * @var float Inner dimension of box used when packing
	 */
	private $width;
	/**
	 * @var float Inner dimension of box used when packing
	 */
	private $length;
	/**
	 * @var float Dimension is stored here if adjusted during packing
	 */
	private $packed_height;
	private $maybe_packed_height = NULL;
	/**
	 * @var float Dimension is stored here if adjusted during packing
	 */
	private $packed_width;
	private $maybe_packed_width = NULL;
	/**
	 * @var float Dimension is stored here if adjusted during packing
	 */
	private $packed_length;
	private $maybe_packed_length = NULL;
	/**
	 * @var float Volume of the box
	 */
	private $volume;
	/**
	 * @var float|null Cached inner volume, used when no volume is set
	 */
	private $computed_volume = null;
	/**
	 * @var array Valid box types which affect packing
	 */
	private $valid_types = array( 'box', 'tube', 'envelope', 'packet' );
	/**
	 * @var string This box type
	 */
	private $type = 'box';

	public function __construct( $length, $width, $height, $weight = 0.0, $max_weight = 0.0, $type = 'box' ) {
		$dimensions = array( floatval( $length ), floatval( $width ), floatval( $height ) );

		sort( $dimensions );

		$this->outer_length = $this->length = $dimensions[2];
		$this->outer_width  = $this->width = $dimensions[1];
		$this->outer_height = $this->height = $dimensions[0];
		$this->weight       = floatval( $weight );
		$this->max_weight   = floatval( $max_weight );

		if ( in_array( $type, $this->valid_types ) ) {
			$this->type = $type;
		}
	}

	/**
	 * @inerhitDoc
	 */
	public function set_id( $id ) {
		$this->id = $id;
	}

	/**
	 * @inerhitDoc
	 */
	public function set_volume( $volume ) {
		$this->volume = floatval( $volume );
	}

	/**
	 * @inerhitDoc
	 */
	public function get_type() {
		return $this->type;
	}

	/**
	 * @inerhitDoc
	 */
	public function set_type( $type ) {
		if ( in_array( $type, $this->valid_types ) ) {
			$this->type = $type;
		}
	}

	/**
	 * @inerhitDoc
	 */
	public function get_max_weight() {
		return $this->max_weight;
	}

	/**
	 * @inerhitDoc
	 */
	public function set_max_weight( $weight ) {
		$this->max_weight = $weight;
	}

	/**
	 * @inerhitDoc
	 */
	public function set_inner_dimensions( $length, $width, $height ) {
		$dimensions = array( $length, $width, $height );

		sort( $dimensions );

		$this->length = $dimensions[2];
		$this->width  = $dimensions[1];
		$this->height = $dimensions[0];

		$this->computed_volume = null;
	}

	/**
	 * See if an item fits into the box.
	 *
	 * @param object $item
	 *
	 * @return bool
	 */
	public function can_fit( $item ) {
		switch ( $this->type ) {
			// Tubes are designed for long thin items so see if the item meets that criteria here.
			case 'tube':
				$can_fit = $this->get_length() >= $item->get_length() && $this->get_width() >= $item->get_width() && $this->get_height() >= $item->get_height() && $item->get_volume() <= $this->get_volume();
				$can_fit = $can_fit && $item->get_length() >= ( ( $item->get_width() + $this->get_height() ) * 2 );
				break;
			// Packets are flexible
			case 'packet':
				$can_fit = $this->get_packed_length() >= $item->get_length() && $this->get_packed_width() >= $item->get_width() && $item->get_volume() <= $this->get_volume();

				if ( $can_fit && $item->get_height() > $this->get_packed_height() ) {
					$this->maybe_packed_height = $item->get_height();
					$this->maybe_packed_length = $this->get_packed_length() - ( $this->maybe_packed_height - $this->get_height() );
					$this->maybe_packed_width  = $this->get_packed_width() - ( $this->maybe_packed_height - $this->get_height() );

					$can_fit = $this->maybe_packed_height < $this->maybe_packed_width && $this->maybe_packed_length >= $item->get_length() && $this->maybe_packed_width >= $item->get_width();
				}
				break;
			// Boxes are easy
			default:
				$can_fit = $this->get_length() >= $item->get_length() && $this->get_width() >= $item->get_width() && $this->get_height() >= $item->get_height() && $item->get_volume() <= $this->get_volume();
				break;
		}

		return $can_fit;
	}

	/**
	 * Reset packed dimensions to originals
	 */
	private function reset_packed_dimensions() {
		$this->packed_length = $this->length;
		$this->packed_width  = $this->width;
		$this->packed_height = $this->height;
	}

	/**
	 * pack function.
	 *
	 *
	 * @param mixed $items
	 *
	 * @return object Package
	 */
	public function pack( $items ) {
		$packed        = array();
		$unpacked      = array();
		$packed_weight = $this->get_weight();
		$packed_volume = 0;
		$packed_value  = 0;

		$this->reset_packed_dimensions();

		$box_volume = $this->get_volume();
		$max_weight = $this->get_max_weight();
		// A packet's can_fit() changes the packed dimensions, so it is never memoised or skipped.
		$pure_fit   = 'packet' !== $this->type;
		$memo_item  = null;
		$memo_fit   = false;
		$min_volume = INF;
		$min_weight = INF;

		if ( $pure_fit ) {
			foreach ( $items as $item ) {
				$v = $item->get_volume();
				$w = $item->get_weight();
				if ( $v < $min_volume ) {
					$min_volume = $v;
				}
				if ( $w < $min_weight ) {
					$min_weight = $w;
				}
			}
		}

		$position = 0;
		foreach ( $items as $item ) {
			++$position;

			// Check dimensions. Units of one line share an Item object, so the result is reused for the run.
			if ( $pure_fit ) {
				if ( $item !== $memo_item ) {
					$memo_item = $item;
					$memo_fit  = $this->can_fit( $item );
				}
				$fits = $memo_fit;
			} else {
				$fits = $this->can_fit( $item );
			}
			if ( ! $fits ) {
				$unpacked[] = $item;
				continue;
			}

			$item_weight = $item->get_weight();
			$item_volume = $item->get_volume();

			// Check max weight
			if ( ( $packed_weight + $item_weight ) > $max_weight && $max_weight > 0 ) {
				$unpacked[] = $item;
				continue;
			}

			// Check volume
			if ( ( $packed_volume + $item_volume ) > $box_volume ) {
				$unpacked[] = $item;
				continue;
			}

			// Pack
			$packed[]      = $item;
			$packed_volume += $item_volume;
			$packed_weight += $item_weight;
			$packed_value  += $item->get_value();

			// Adjust dimensions if needed, after this item has been packed inside
			if ( ! is_null( $this->maybe_packed_height ) ) {
				$this->packed_height       = $this->maybe_packed_height;
				$this->packed_length       = $this->maybe_packed_length;
				$this->packed_width        = $this->maybe_packed_width;
				$this->maybe_packed_height = NULL;
				$this->maybe_packed_length = NULL;
				$this->maybe_packed_width  = NULL;
			}

			// Full: no remaining item can pass the volume or weight check (float addition is monotonic).
			if ( $pure_fit && ( ( $packed_volume + $min_volume ) > $box_volume || ( ( $packed_weight + $min_weight ) > $max_weight && $max_weight > 0 ) ) ) {
				foreach ( array_slice( $items, $position ) as $rest ) {
					$unpacked[] = $rest;
				}
				break;
			}
		}

		return $this->make_package( $packed, $unpacked, $packed_weight, $packed_volume, $packed_value );
	}

	private function make_package( $packed, $unpacked, $packed_weight, $packed_volume, $packed_value ) {
		// Get weight of unpacked items
		$unpacked_weight = 0;
		$unpacked_volume = 0;
		foreach ( $unpacked as $item ) {
			$unpacked_weight += $item->get_weight();
			$unpacked_volume += $item->get_volume();
		}

		$package = new Package( $this->id, $this->type, $packed_weight, $packed_volume, $this->get_outer_length(), $this->get_outer_width(), $this->get_outer_height(), $packed_value, $unpacked, $packed );

		$package->percent = self::success_percent( $packed_weight - $this->get_weight(), $packed_volume, $unpacked_weight, $unpacked_volume, sizeof( $packed ), sizeof( $unpacked ) );

		return $package;
	}

	/**
	 * Packing success % based on % of weight and volume of all items packed.
	 * Packer::repeat_iterations() relies on this being the only place the value is computed.
	 *
	 * @internal Not part of the public API; it can change in any release.
	 *
	 * @param float $packed_weight_to_compare Weight of the packed items, without the box.
	 * @param float $packed_volume            Volume of the packed items.
	 * @param float $unpacked_weight          Weight of the items left over.
	 * @param float $unpacked_volume          Volume of the items left over.
	 * @param int   $packed_count             Number of packed items.
	 * @param int   $unpacked_count           Number of items left over.
	 *
	 * @return float|int
	 */
	public static function success_percent( $packed_weight_to_compare, $packed_volume, $unpacked_weight, $unpacked_volume, $packed_count, $unpacked_count ) {
		$packed_weight_ratio = NULL;
		$packed_volume_ratio = NULL;

		if ( $packed_weight_to_compare + $unpacked_weight > 0 ) {
			$packed_weight_ratio = $packed_weight_to_compare / ( $packed_weight_to_compare + $unpacked_weight );
		}
		if ( $packed_volume + $unpacked_volume ) {
			$packed_volume_ratio = $packed_volume / ( $packed_volume + $unpacked_volume );
		}

		if ( is_null( $packed_weight_ratio ) && is_null( $packed_volume_ratio ) ) {
			// Fallback to amount packed
			return ( $packed_count / ( $unpacked_count + $packed_count ) ) * 100;
		} elseif ( is_null( $packed_weight_ratio ) ) {
			// Volume only
			return $packed_volume_ratio * 100;
		} elseif ( is_null( $packed_volume_ratio ) ) {
			// Weight only
			return $packed_weight_ratio * 100;
		}

		return $packed_weight_ratio * $packed_volume_ratio * 100;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_volume() {
		if ( $this->volume ) {
			return $this->volume;
		}

		if ( null === $this->computed_volume ) {
			$this->computed_volume = floatval( $this->get_height() * $this->get_width() * $this->get_length() );
		}

		return $this->computed_volume;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_height() {
		return $this->height;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_width() {
		return $this->width;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_length() {
		return $this->length;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_weight() {
		return $this->weight;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_outer_height() {
		return $this->outer_height;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_outer_width() {
		return $this->outer_width;
	}

	/**
	 * @inerhitDoc
	 */
	public function get_outer_length() {
		return $this->outer_length;
	}

	/**
	 * get_packed_height
	 *
	 * @return float
	 */
	public function get_packed_height() {
		return $this->packed_height;
	}

	/**
	 * get_packed_width
	 *
	 * @return float
	 */
	public function get_packed_width() {
		return $this->packed_width;
	}

	/**
	 * get_packed_length.
	 *
	 * @return float
	 */
	public function get_packed_length() {
		return $this->packed_length;
	}

}
