<?php

namespace WooCommerce\BoxPacker\DVDoug;

use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\InfalliblePacker;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\Item;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\ItemList;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\PackedBox;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\PackedBoxList;
use WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker\VolumePacker;

/**
 * Exposes one doVolumePacking() iteration, so a run of identical items can be packed once per box
 * type and then repeated.
 *
 * @internal Not part of the public API; it can change in any release.
 */
class Probe_Packer extends InfalliblePacker {

	/**
	 * Pack the current item list into every box, in BoxList order (smallest first).
	 *
	 * @return PackedBox[] Non-empty results, in BoxList order.
	 */
	public function pack_each_box(): array {
		$results = array();
		foreach ( $this->boxes as $box ) {
			$volume_packer = new VolumePacker( $box, $this->items );
			$volume_packer->setLogger( $this->logger );
			$packed_box = $volume_packer->pack();
			if ( $packed_box->getItems()->count() ) {
				$results[] = $packed_box;
			}
		}

		return $results;
	}

	/**
	 * The box doVolumePacking() picks when $remaining units of $item are left, given what each box
	 * packed from a list longer than any box holds. Uses dvdoug's own box order and comparison.
	 *
	 * @param Item        $item      The only item in the cart.
	 * @param int         $remaining Units left; more than any box holds.
	 * @param PackedBox[] $results   From pack_each_box().
	 */
	public function best_box( Item $item, int $remaining, array $results ): PackedBox {
		$by_box = array();
		foreach ( $results as $result ) {
			$by_box[ spl_object_id( $result->getBox() ) ] = $result;
		}

		// getBoxList() reads the volume of $this->items; one run of $remaining units is O(1) with the patched ItemList.
		$this->items = new ItemList();
		$this->items->insert( $item, $remaining );

		$iteration = array();
		foreach ( $this->getBoxList() as $box ) {
			if ( isset( $by_box[ spl_object_id( $box ) ] ) ) {
				$iteration[] = $by_box[ spl_object_id( $box ) ];
			}
		}

		return $this->findBestBoxFromIteration( $iteration );
	}

	/**
	 * Boxes in the order pack() inserted them (PackedBoxList sorts only when iterated).
	 *
	 * @return PackedBox[]
	 */
	public static function insertion_order( PackedBoxList $list ): array {
		return $list->jsonSerialize();
	}
}
