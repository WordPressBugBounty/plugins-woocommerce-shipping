<?php

/**
 * Box packing (3D bin packing, knapsack problem).
 *
 * @author Doug Wright
 */
declare (strict_types=1);
namespace WooCommerce\BoxPacker\Vendor\DVDoug\BoxPacker;

use function array_merge;
use function iterator_to_array;
use function max;
use WooCommerce\BoxPacker\Vendor\Psr\Log\LoggerAwareInterface;
use WooCommerce\BoxPacker\Vendor\Psr\Log\LoggerInterface;
use WooCommerce\BoxPacker\Vendor\Psr\Log\NullLogger;
use function sort;
/**
 * Layer packer.
 *
 * @internal
 * @author Doug Wright
 */
class LayerPacker implements LoggerAwareInterface
{
    /**
     * The logger instance.
     *
     * @var LoggerInterface
     */
    private $logger;
    /**
     * Box to pack items into.
     *
     * @var Box
     */
    private $box;
    /**
     * Whether the packer is in single-pass mode.
     *
     * @var bool
     */
    private $singlePassMode = \false;
    /**
     * @var OrientatedItemFactory
     */
    private $orientatedItemFactory;
    /**
     * Constructor.
     */
    public function __construct(Box $box)
    {
        $this->box = $box;
        $this->logger = new NullLogger();
        $this->orientatedItemFactory = new OrientatedItemFactory($this->box);
        $this->orientatedItemFactory->setLogger($this->logger);
    }
    /**
     * Sets a logger.
     */
    public function setLogger(LoggerInterface $logger): void
    {
        $this->logger = $logger;
        $this->orientatedItemFactory->setLogger($logger);
    }
    public function setSinglePassMode(bool $singlePassMode): void
    {
        $this->singlePassMode = $singlePassMode;
        $this->orientatedItemFactory->setSinglePassMode($singlePassMode);
    }
    /**
     * Pack items into an individual vertical layer.
     */
    public function packLayer(ItemList &$items, PackedItemList $packedItemList, int $startX, int $startY, int $startZ, int $widthForLayer, int $lengthForLayer, int $depthForLayer, int $guidelineLayerDepth, bool $considerStability): PackedLayer
    {
        $layer = new PackedLayer();
        $x = $startX;
        $y = $startY;
        $z = $startZ;
        $rowLength = 0;
        $prevItem = null;
        // PATCHED: skipped items as runs of [Item, qty], largest first (extraction order).
        $skippedItems = [];
        $remainingWeightAllowed = $this->box->getMaxWeight() - $this->box->getEmptyWeight() - $packedItemList->getWeight();
        while ($items->count() > 0) {
            $itemToPack = $items->extract();
            //skip items that will never fit e.g. too heavy
            if (!$this->checkNonDimensionalConstraints($itemToPack, $remainingWeightAllowed, $packedItemList)) {
                // PATCHED: the next copies of the same object would fail the same check; drop them together.
                if (!$itemToPack instanceof ConstrainedItem) {
                    $items->extractCopiesOf($itemToPack, \PHP_INT_MAX);
                }
                continue;
            }
            $orientatedItem = $this->orientatedItemFactory->getBestOrientation($itemToPack, $prevItem, $items, $widthForLayer - $x, $lengthForLayer - $y, $depthForLayer, $rowLength, $x, $y, $z, $packedItemList, $considerStability);
            if ($orientatedItem instanceof OrientatedItem) {
                $packedItem = PackedItem::fromOrientatedItem($orientatedItem, $x, $y, $z);
                $layer->insert($packedItem);
                $packedItemList->insert($packedItem);
                $rowLength = max($rowLength, $packedItem->getLength());
                $prevItem = $orientatedItem;
                //Figure out if we can stack items on top of this rather than side by side
                //e.g. when we've packed a tall item, and have just put a shorter one next to it.
                $stackableDepth = ($guidelineLayerDepth ?: $layer->getDepth()) - $packedItem->getDepth();
                if ($stackableDepth > 0) {
                    $stackedLayer = $this->packLayer($items, $packedItemList, $x, $y, $z + $packedItem->getDepth(), $x + $packedItem->getWidth(), $y + $packedItem->getLength(), $stackableDepth, $stackableDepth, $considerStability);
                    $layer->merge($stackedLayer);
                }
                $x += $packedItem->getWidth();
                $remainingWeightAllowed = $this->box->getMaxWeight() - $this->box->getEmptyWeight() - $packedItemList->getWeight();
                // remember may have packed additional items
                if ($items->count() === 0 && $skippedItems) {
                    $items = ItemList::fromRunsOnTopOf($skippedItems, $items);
                    $skippedItems = [];
                }
                continue;
            }
            if ($items->count() > 0) {
                // skip for now, move on to the next item
                $this->logger->debug("doesn't fit, skipping for now");
                static::addSkipped($skippedItems, $itemToPack, 1);
                // abandon here if next item is the same, no point trying to keep going. Last time is not skipped, need that to trigger appropriate reset logic
                while ($items->count() > 1 && static::isSameDimensions($itemToPack, $items->top())) {
                    $top = $items->top();
                    static::addSkipped($skippedItems, $top, $items->extractCopiesOf($top, $items->count() - 1));
                }
                continue;
            }
            if ($x > $startX) {
                //Having now placed items, there is space *within the same row* along the length. Pack into that.
                $this->logger->debug('No more fit in width wise, packing along remaining length');
                $layer->merge($this->packLayer($items, $packedItemList, $x, $y + $rowLength, $z, $widthForLayer, $lengthForLayer - $rowLength, $depthForLayer, $layer->getDepth(), $considerStability));
                $this->logger->debug('No more fit in width wise, resetting for new row');
                $y += $rowLength;
                $x = $startX;
                $rowLength = 0;
                static::addSkipped($skippedItems, $itemToPack, 1);
                $items = ItemList::fromRuns($skippedItems);
                $skippedItems = [];
                $prevItem = null;
                continue;
            }
            $this->logger->debug('no items fit, so starting next vertical layer');
            static::addSkipped($skippedItems, $itemToPack, 1);
            $items = ItemList::fromRunsOnTopOf($skippedItems, $items);
            return $layer;
        }
        return $layer;
    }
    /**
     * As well as purely dimensional constraints, there are other constraints that need to be met
     * e.g. weight limits or item-specific restrictions (e.g. max <x> batteries per box).
     */
    private function checkNonDimensionalConstraints(Item $itemToPack, int $remainingWeightAllowed, PackedItemList $packedItemList): bool
    {
        $customConstraintsOK = \true;
        if ($itemToPack instanceof ConstrainedItem && !$this->box instanceof WorkingVolume) {
            $customConstraintsOK = $itemToPack->canBePackedInBox($packedItemList, $this->box);
        }
        return $customConstraintsOK && $itemToPack->getWeight() <= $remainingWeightAllowed;
    }
    private static function addSkipped(array &$skippedItems, Item $item, int $qty): void
    {
        $last = \count($skippedItems) - 1;
        if ($last >= 0 && $skippedItems[$last][0] === $item) {
            $skippedItems[$last][1] += $qty;
        } else {
            $skippedItems[] = [$item, $qty];
        }
    }
    /**
     * Compare two items to see if they have same dimensions.
     */
    private static function isSameDimensions(Item $itemA, Item $itemB): bool
    {
        if ($itemA === $itemB) {
            return \true;
        }
        $itemADimensions = [$itemA->getWidth(), $itemA->getLength(), $itemA->getDepth()];
        $itemBDimensions = [$itemB->getWidth(), $itemB->getLength(), $itemB->getDepth()];
        sort($itemADimensions);
        sort($itemBDimensions);
        return $itemADimensions === $itemBDimensions;
    }
}
