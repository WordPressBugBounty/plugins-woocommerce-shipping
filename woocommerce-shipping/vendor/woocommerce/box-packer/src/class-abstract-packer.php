<?php

namespace WooCommerce\BoxPacker;

use Exception;

abstract class Abstract_Packer {

	/**
	 * Default for the `woocommerce_box_packer_max_units` filter: the most units one pack() call
	 * accepts when the cart can't take the packer's fast path.
	 */
	const MAX_UNITS = 3000;

	/**
	 * Default for the same filter when the cart is one line the packer's fast path can take.
	 */
	const MAX_UNITS_FAST_PATH = 30000;

	protected $dimension_unit;
	protected $weight_unit;
	protected $boxes;
	protected $items;
	protected $packages;
	protected $cannot_pack;
	/**
	 * @var bool Try to pack into envelopes and packets
	 */
	protected $prefer_packets = false;

	/**
	 * __construct function.
	 *
	 * @param string $dimension_unit
	 * @param string $weight_unit
	 * @param array $options Optional. An array of options.
	 *
	 * @since 1.0.2 Added `$options` parameter and '$prefer_packets' option.
	 *
	 * @return void
	 */
	public function __construct( $dimension_unit, $weight_unit, $options = array() ) {
		$this->dimension_unit = $dimension_unit;
		$this->weight_unit    = $weight_unit;

		if ( isset( $options['prefer_packets'] ) ) {
			$this->prefer_packets = $options['prefer_packets'];
		}
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
	abstract public function add_item( $length, $width, $height, $weight, $value = '', $meta = array(), $qty = 1 );

	abstract public function add_box( $length, $width, $height, $weight = 0, $max_weight = 0.0, $type = '' );

	abstract public function pack();

	/**
	 * clear_items function.
	 *
	 * @return void
	 */
	public function clear_items() {
		$this->items = array();
	}

	/**
	 * clear_boxes function.
	 *
	 * @return void
	 */
	public function clear_boxes() {
		$this->boxes = array();
	}

	/**
	 * clear_packages function.
	 *
	 * @return void
	 */
	public function clear_packages() {
		$this->packages = array();
	}

	/**
	 * get_packages function.
	 *
	 * @return array
	 */
	public function get_packages() {
		return $this->packages ?: array();
	}

	/**
	 * handle_unpacked_item function.
	 *
	 * @return void
	 */
	public function handle_unpacked_item( $item ) {
		$this->packages[] = new Package( '', 'box', $item->get_weight(), $item->get_volume(), $item->get_length(), $item->get_width(), $item->get_height(), $item->get_value(), true );
	}

	/**
	 * Log a packing error to the WooCommerce log, source `box-packer`.
	 *
	 * Up to 1.4.0 this printed the error for admins. Printed text breaks the JSON of Store API and
	 * AJAX responses, so the block cart failed for admins, and nothing was logged.
	 *
	 * @param string $message The packing error message.
	 *
	 * @return void
	 */
	public function maybe_display_packing_error( $message ) {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->warning( 'Packing error: ' . $message, array( 'source' => 'box-packer' ) );
		}
	}

	/**
	 * The most units one pack() call accepts.
	 *
	 * Packing time grows with the unit count. The fast paths pack one line of one product far
	 * faster than any other cart, so those carts get a higher limit.
	 *
	 * @param bool $fast_path Whether the cart is one line the packer's fast path can take.
	 *
	 * @return float
	 */
	protected function get_max_units( bool $fast_path ): float {
		$default = $fast_path ? static::MAX_UNITS_FAST_PATH : static::MAX_UNITS;

		/**
		 * Filters the most units one pack() call accepts. Over it, nothing is packed.
		 *
		 * Return INF to turn the limit off. A value that is not a number above 0 keeps the default.
		 * The Speed Packer also reads this filter in add_item(), once for each value of $fast_path.
		 *
		 * @since 1.4.1
		 *
		 * @param int|float       $max_units Default 3,000, or 30,000 when $fast_path is true.
		 * @param Abstract_Packer $packer    The packer.
		 * @param bool            $fast_path Whether the cart is one line the packer's fast path can take.
		 */
		$max_units = apply_filters( 'woocommerce_box_packer_max_units', $default, $this, $fast_path );

		return is_numeric( $max_units ) && $max_units > 0 ? (float) $max_units : (float) $default;
	}

	/**
	 * @param float $units     Units in the cart.
	 * @param bool  $fast_path Whether the cart is one line the packer's fast path can take.
	 *
	 * @throws Exception When $units is over the limit.
	 *
	 * @return void
	 */
	protected function check_unit_count( float $units, bool $fast_path ) {
		$max_units = $this->get_max_units( $fast_path );
		if ( $units > $max_units ) {
			throw new Exception( sprintf( 'Too many items to pack: %s units, the limit is %s.', number_format( $units ), number_format( $max_units ) ) );
		}
	}

	/**
	 * Order boxes by weight and volume
	 *
	 * @param array $sort
	 *
	 * @return array
	 */
	protected function order_boxes( $sort ) {
		if ( ! empty( $sort ) ) {
			uasort( $sort, array( $this, 'box_sorting' ) );
		}

		return $sort;
	}

	/**
	 * Order items by weight and volume
	 * $param array $sort
	 *
	 * @return array
	 */
	protected function order_items( $sort ) {
		if ( ! empty( $sort ) ) {
			uasort( $sort, array( $this, 'item_sorting' ) );
		}

		return $sort;
	}

	/**
	 * item_sorting function.
	 *
	 *
	 * @param mixed $a
	 * @param mixed $b
	 *
	 * @return int
	 */
	public function item_sorting( $a, $b ) {
		if ( $a->get_volume() == $b->get_volume() ) {
			if ( $a->get_weight() == $b->get_weight() ) {
				return 0;
			}

			return ( $a->get_weight() < $b->get_weight() ) ? 1 : - 1;
		}

		return ( $a->get_volume() < $b->get_volume() ) ? 1 : - 1;
	}

	/**
	 * box_sorting function.
	 *
	 *
	 * @param mixed $a
	 * @param mixed $b
	 *
	 * @return int
	 */
	public function box_sorting( $a, $b ) {

		if ( $this->prefer_packets ) {
			// check 'envelope', 'packet' first as they are cheaper even if their volume is more
			$a_cheaper_packaging = in_array( $a->get_type(), array( 'envelope', 'packet' ) );
			$b_cheaper_packaging = in_array( $b->get_type(), array( 'envelope', 'packet' ) );

			if ( $a_cheaper_packaging && ! $b_cheaper_packaging ) {
				return 1;
			}

			if ( $b_cheaper_packaging && ! $a_cheaper_packaging ) {
				return - 1;
			}
		}

		if ( $a->get_volume() == $b->get_volume() ) {
			if ( $a->get_max_weight() == $b->get_max_weight() ) {
				return 0;
			}

			return ( $a->get_max_weight() < $b->get_max_weight() ) ? 1 : - 1;
		}

		return ( $a->get_volume() < $b->get_volume() ) ? 1 : - 1;
	}

}
