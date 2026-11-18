<?php

/**
 * Box packing (3D bin packing, knapsack problem).
 *
 * @author Doug Wright
 */
declare (strict_types=1);
namespace WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker;

use function array_reverse;
use ArrayIterator;
use function count;
use Countable;
use IteratorAggregate;
use Traversable;
use function usort;
/**
 * List of items to be packed, ordered by volume.
 *
 * PATCHED by woocommerce/box-packer: stored run-length encoded. Each run is [Item, qty] for
 * consecutive copies of the same object, so copies of one item cost O(1), not O(qty).
 * The order of items is exactly what the one-slot-per-unit list had.
 *
 * @author Doug Wright
 */
class ItemList implements Countable, IteratorAggregate
{
    /**
     * Runs of [Item, qty], smallest first; the largest item is at the end (like the old list).
     *
     * @var array<int, array{0: Item, 1: int}>
     */
    private $runs = [];
    /**
     * @var int
     */
    private $count = 0;
    /**
     * Has this list already been sorted?
     *
     * @var bool
     */
    private $isSorted = \false;
    /**
     * Does this list contain constrained items?
     *
     * @var bool
     */
    private $hasConstrainedItems;
    /**
     * Do a bulk create.
     *
     * @param  Item[]   $items
     * @return ItemList
     */
    public static function fromArray(array $items, bool $preSorted = \false): self
    {
        $list = new static();
        // internal sort is largest at the end
        foreach (array_reverse($items) as $item) {
            $list->push($item, 1);
        }
        $list->isSorted = $preSorted;
        return $list;
    }
    /**
     * @internal Build from runs given largest first (the order extract() returns them), already sorted.
     *
     * @param array<int, array{0: Item, 1: int}> $runsLargestFirst
     */
    public static function fromRuns(array $runsLargestFirst): self
    {
        $list = new static();
        $list->pushRunsReversed($runsLargestFirst);
        $list->isSorted = \true;
        return $list;
    }
    /**
     * @internal New sorted list: $runsLargestFirst on top of the items of $below.
     *
     * @param array<int, array{0: Item, 1: int}> $runsLargestFirst
     */
    public static function fromRunsOnTopOf(array $runsLargestFirst, self $below): self
    {
        $list = clone $below;
        $list->sortIfNeeded();
        $list->hasConstrainedItems = null;
        $list->pushRunsReversed($runsLargestFirst);
        return $list;
    }
    private function pushRunsReversed(array $runsLargestFirst): void
    {
        for ($i = count($runsLargestFirst) - 1; $i >= 0; --$i) {
            $this->push($runsLargestFirst[$i][0], $runsLargestFirst[$i][1]);
        }
    }
    private function push(Item $item, int $qty): void
    {
        if ($qty <= 0) {
            return;
        }
        $last = count($this->runs) - 1;
        if ($last >= 0 && $this->runs[$last][0] === $item) {
            $this->runs[$last][1] += $qty;
        } else {
            $this->runs[] = [$item, $qty];
        }
        $this->count += $qty;
    }
    private function sortIfNeeded(): void
    {
        if ($this->isSorted) {
            return;
        }
        if (\PHP_VERSION_ID >= 80000) {
            // A stable sort of runs equals a stable sort of the expanded list: items in a run compare equal.
            usort($this->runs, static function (array $a, array $b): int {
                return static::compare($a[0], $b[0]);
            });
            $runs = $this->runs;
        } else {
            // PHP 7 sorts are not stable: sort the expanded list exactly as the unpatched class did.
            $list = [];
            foreach ($this->runs as $run) {
                for ($q = $run[1]; $q > 0; --$q) {
                    $list[] = $run[0];
                }
            }
            usort($list, static function (Item $a, Item $b): int {
                return static::compare($a, $b);
            });
            $runs = [];
            foreach ($list as $item) {
                $runs[] = [$item, 1];
            }
        }
        $this->runs = [];
        $this->count = 0;
        foreach ($runs as $run) {
            $this->push($run[0], $run[1]);
        }
        $this->isSorted = \true;
    }
    public function insert(Item $item, int $qty = 1): void
    {
        $this->push($item, $qty);
        $this->isSorted = \false;
        $this->hasConstrainedItems = $this->hasConstrainedItems || $item instanceof ConstrainedPlacementItem;
    }
    /**
     * Remove item from list.
     */
    public function remove(Item $item): void
    {
        $this->sortIfNeeded();
        $this->removeTopmost($item);
    }
    public function removePackedItems(PackedItemList $packedItemList): void
    {
        foreach ($packedItemList as $packedItem) {
            $this->removeTopmost($packedItem->getItem());
        }
    }
    private function removeTopmost(Item $item): void
    {
        for ($i = count($this->runs) - 1; $i >= 0; --$i) {
            if ($this->runs[$i][0] === $item) {
                $this->takeFromRun($i, 1);
                return;
            }
        }
    }
    private function takeFromRun(int $i, int $qty): void
    {
        $this->count -= $qty;
        if ($this->runs[$i][1] > $qty) {
            $this->runs[$i][1] -= $qty;
            return;
        }
        if ($i === count($this->runs) - 1) {
            array_pop($this->runs);
            return;
        }
        array_splice($this->runs, $i, 1);
        // Neighbours may now be the same object.
        if ($i > 0 && isset($this->runs[$i]) && $this->runs[$i - 1][0] === $this->runs[$i][0]) {
            $this->runs[$i - 1][1] += $this->runs[$i][1];
            array_splice($this->runs, $i, 1);
        }
    }
    /**
     * @internal
     */
    public function extract(): Item
    {
        $this->sortIfNeeded();
        $last = count($this->runs) - 1;
        $item = $this->runs[$last][0];
        $this->takeFromRun($last, 1);
        return $item;
    }
    /**
     * @internal Remove up to $max copies of the top item if it is $item. Returns how many were removed.
     */
    public function extractCopiesOf(Item $item, int $max): int
    {
        $this->sortIfNeeded();
        $last = count($this->runs) - 1;
        if ($max <= 0 || $last < 0 || $this->runs[$last][0] !== $item) {
            return 0;
        }
        $qty = $this->runs[$last][1] < $max ? $this->runs[$last][1] : $max;
        $this->takeFromRun($last, $qty);
        return $qty;
    }
    /**
     * @internal
     */
    public function top(): Item
    {
        $this->sortIfNeeded();
        return $this->runs[count($this->runs) - 1][0];
    }
    /**
     * @internal
     * @return ItemList
     */
    public function topN(int $n): self
    {
        $this->sortIfNeeded();
        $taken = [];
        for ($i = count($this->runs) - 1; $i >= 0 && $n > 0; --$i) {
            $qty = $this->runs[$i][1] < $n ? $this->runs[$i][1] : $n;
            $taken[] = [$this->runs[$i][0], $qty];
            $n -= $qty;
        }
        return static::fromRuns($taken);
    }
    /**
     * @internal Sum of item volumes.
     */
    public function getVolume(): int
    {
        // Packer::getBoxList() used to iterate, which sorts; keep that side effect.
        $this->sortIfNeeded();
        $volume = 0;
        foreach ($this->runs as [$item, $qty]) {
            $volume += $item->getWidth() * $item->getLength() * $item->getDepth() * $qty;
        }
        return $volume;
    }
    /**
     * @return Traversable|Item[]
     */
    public function getIterator(): Traversable
    {
        $this->sortIfNeeded();
        $items = [];
        for ($i = count($this->runs) - 1; $i >= 0; --$i) {
            for ($q = $this->runs[$i][1]; $q > 0; --$q) {
                $items[] = $this->runs[$i][0];
            }
        }
        return new ArrayIterator($items);
    }
    /**
     * Number of items in list.
     */
    public function count(): int
    {
        return $this->count;
    }
    /**
     * Does this list contain items with constrained placement criteria.
     */
    public function hasConstrainedItems(): bool
    {
        if (!isset($this->hasConstrainedItems)) {
            $this->hasConstrainedItems = \false;
            foreach ($this->runs as $run) {
                if ($run[0] instanceof ConstrainedPlacementItem) {
                    $this->hasConstrainedItems = \true;
                    break;
                }
            }
        }
        return $this->hasConstrainedItems;
    }
    private static function compare(Item $itemA, Item $itemB): int
    {
        $volumeDecider = $itemA->getWidth() * $itemA->getLength() * $itemA->getDepth() <=> $itemB->getWidth() * $itemB->getLength() * $itemB->getDepth();
        if ($volumeDecider !== 0) {
            return $volumeDecider;
        }
        $weightDecider = $itemA->getWeight() - $itemB->getWeight();
        if ($weightDecider !== 0) {
            return $weightDecider;
        }
        return $itemB->getDescription() <=> $itemA->getDescription();
    }
}
