<?php

namespace WooCommerce\BoxPacker;

class Package {

	/**
	 * @var string
	 */
	public $id;
	/**
	 * @var string
	 */
	public $type;
	/**
	 * @var float
	 */
	public $weight;
	/**
	 * @var float
	 */
	public $volume;
	/**
	 * @var float
	 */
	public $length;
	/**
	 * @var float
	 */
	public $width;
	/**
	 * @var float
	 */
	public $height;
	/**
	 * @var float
	 */
	public $value;
	/**
	 * @var array|bool
	 */
	public $unpacked;
	/**
	 * @var array
	 */
	public $packed;
	/**
	 * @var float|int
	 */
	public $percent;
	/**
	 * @var \stdClass|null Holds the list `unpacked` is a prefix of in `items`, while it is built on read.
	 *                     See set_unpacked_prefix().
	 */
	private $unpacked_source = null;
	/**
	 * @var int The length of that prefix.
	 */
	private $unpacked_length = 0;

	/**
	 * @param $id string
	 * @param $type string
	 * @param $weight float The total weight of the packed box
	 * @param $volume float The combined volume of all packed items
	 * @param $length float The outer length of the packed box
	 * @param $width float The outer width of the packed box
	 * @param $height float The outer height of the packed box
	 * @param $value float The combined value of all packed items
	 * @param array|bool $unpacked The unpacked items
	 *                             or true if packing an unpacked item individually
	 * @param array $packed The packed items
	 */
	public function __construct( $id, $type, $weight, $volume, $length, $width, $height, $value, $unpacked, $packed = array() ) {
		$this->id       = $id;
		$this->type     = $type;
		$this->weight   = floatval( $weight );
		$this->volume   = floatval( $volume );
		$this->length   = floatval( $length );
		$this->width    = floatval( $width );
		$this->height   = floatval( $height );
		$this->value    = floatval( $value );
		$this->unpacked = $unpacked;
		$this->packed   = $packed;
	}

	/**
	 * Make `unpacked` the first $length items of $items->items, built each time it is read.
	 *
	 * The Speed Packer's fast path gives every package of a run of identical items a prefix of one
	 * list. Storing each prefix as its own array needs memory that grows with the square of the
	 * quantity; sharing the list keeps it linear. Reading `unpacked` still returns the same array.
	 * The list is held in an object, so serialize() also writes it only once for all the packages.
	 *
	 * @internal Not part of the public API; it can change in any release.
	 *
	 * @param \stdClass $items  Holds the list to take the prefix from in `items`. Never changed after.
	 * @param int       $length The prefix length.
	 *
	 * @return void
	 */
	public function set_unpacked_prefix( \stdClass $items, int $length ) {
		// With the declared property unset, reads and writes of it go through __get() and __set().
		// unserialize() sets it again, so __unserialize() unsets it too.
		unset( $this->unpacked );
		$this->unpacked_source = $items;
		$this->unpacked_length = $length;
	}

	/**
	 * @param string $name Property name.
	 *
	 * @return mixed
	 */
	public function __get( $name ) {
		if ( 'unpacked' === $name && null !== $this->unpacked_source ) {
			return array_slice( $this->unpacked_source->items, 0, $this->unpacked_length );
		}
		trigger_error( sprintf( 'Undefined property: %s::$%s', static::class, $name ), PHP_VERSION_ID >= 80000 ? E_USER_WARNING : E_USER_NOTICE );

		return null;
	}

	/**
	 * @param string $name  Property name.
	 * @param mixed  $value Value.
	 *
	 * @return void
	 */
	public function __set( $name, $value ) {
		if ( 'unpacked' === $name ) {
			$this->unpacked_source = null;
		}
		// Inside __set() this writes the property directly, so `unpacked` becomes a plain property again.
		$this->$name = $value;
	}

	/**
	 * @param string $name Property name.
	 *
	 * @return bool
	 */
	public function __isset( $name ) {
		return 'unpacked' === $name && null !== $this->unpacked_source;
	}

	/**
	 * Unsetting a built-on-read `unpacked` clears it, like unsetting the plain property.
	 *
	 * @param string $name Property name.
	 *
	 * @return void
	 */
	public function __unset( $name ) {
		if ( 'unpacked' === $name ) {
			$this->unpacked_source = null;
		}
	}

	/**
	 * @return array The properties that are set. A built-on-read `unpacked` stays out, as its prefix.
	 */
	public function __serialize(): array {
		return get_object_vars( $this );
	}

	/**
	 * unserialize() sets every declared property, so unset `unpacked` again when it is built on read.
	 *
	 * @param array $data From __serialize(), or the properties of a Package serialized before 1.4.1.
	 *
	 * @return void
	 */
	public function __unserialize( array $data ) {
		foreach ( $data as $name => $value ) {
			$this->$name = $value;
		}
		if ( null !== $this->unpacked_source ) {
			unset( $this->unpacked );
		}
	}

}