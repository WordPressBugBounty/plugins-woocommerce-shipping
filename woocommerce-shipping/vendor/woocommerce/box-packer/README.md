## WooCommerce Box Packer

The box packing library shared by the WooCommerce shipping extensions. It wraps two
interchangeable packing strategies behind one API:

| Library    | Description                                                                   |
|------------|-------------------------------------------------------------------------------|
| `original` | The historical volume-based packer. Fast, approximate.                        |
| `dvdoug`   | [dvdoug/boxpacker](https://github.com/dvdoug/BoxPacker) — true 3D bin packing. |

### Requirements

PHP 7.4 or newer. The floor is set by the consuming extensions, which all declare
`Requires PHP: 7.4`.

### Installation

This is a private repository, so add it as a VCS repository and require it by tag:

```json
{
  "repositories": [
    {
      "type": "vcs",
      "url": "https://github.com/woocommerce/box-packer"
    }
  ],
  "require": {
    "woocommerce/box-packer": "1.4.1"
  }
}
```

Pin an exact tag rather than a range — every shipping extension ships its `vendor/`
directory, so the resolved version is part of the release artefact.

> **Note on autoloading.** The source files are named `class-*.php`, which does not satisfy
> PSR-4, so Composer skips them when it builds its own classmap and `vendor/autoload.php`
> never resolves `WooCommerce\BoxPacker\*`. What does load them is the
> [Jetpack Autoloader](https://github.com/Automattic/jetpack-autoloader) that consuming
> extensions use: installed with `--optimize-autoloader` it writes these classes into its
> `jetpack_autoload_classmap.php`, and installed without it falls back to a PSR-4 manifest
> that cannot find them either.

### Usage

```php
use WooCommerce\BoxPacker\WC_Boxpack;

$boxpack = new WC_Boxpack( 'in', 'lbs', 'dvdoug', array( 'prefer_packets' => false ) );
$packer  = $boxpack->get_packer();

// Boxes you ship in: length, width, height, empty weight, max weight, type.
// Type is one of box, tube, envelope, packet - it changes how items are fitted.
$box = $packer->add_box( 12, 9, 4, 0.2, 50, 'box' );
$box->set_id( 'SMALL-1' );

$box = $packer->add_box( 18, 14, 8, 0.3, 70, 'box' );
$box->set_id( 'MEDIUM-1' );

// Cart items: length, width, height, weight, value, meta, quantity.
foreach ( $cart_items as $item ) {
	$product = $item['data'];

	$packer->add_item(
		$product->get_length(),
		$product->get_width(),
		$product->get_height(),
		$product->get_weight(),
		$product->get_price(),
		array( 'product_id' => $product->get_id() ),
		$item['quantity']
	);
}

$packer->pack();

foreach ( $packer->get_packages() as $package ) {
	// $package is a WooCommerce\BoxPacker\Package. It exposes public properties,
	// not getters:
	//
	//   $package->id       string      The box id set via set_id()
	//   $package->type     string      The box type
	//   $package->weight   float       Total weight of the packed box
	//   $package->volume   float       Combined volume of the packed items
	//   $package->length   float       Outer dimensions of the box
	//   $package->width    float
	//   $package->height   float
	//   $package->value    float       Combined value of the packed items
	//   $package->unpacked array|bool  See "Reading the packages" below
	//   $package->packed   array       The packed items
	//   $package->percent  float|null  Packing score, set by the original packer only
}
```

### Reading the packages

`$package->unpacked` is not a list of items that could not be shipped. The `original`
packer records what each box left over for the next round, and those items are packed
into the packages that follow, so a successful multi-box pack still reports a non-empty
`unpacked` on every package but the last. The `dvdoug` packer always leaves it empty.

For a run of identical units, the `original` packer's packages share one list, and
`unpacked` is built from it each time it is read. It reads and writes like a normal array
property, but `get_object_vars()`, an `(array)` cast and `json_encode()` leave it out for
those packages. Each read copies the list, so read it once per package, not in a loop.
`serialize()` and `unserialize()` keep it, and write the shared list only once, so packages
cached in a transient or the object cache come back the same.

The only real "could not pack" signal is `$package->unpacked === true`. That marks a
single over-sized item shipped on its own, and such a package is shaped differently from
a packed box: `id` is `''`, `type` is `'box'`, `length`/`width`/`height` are the item's
own dimensions rather than a box's, and `packed` is empty. Code that keys packages by
`id` or walks `packed` has to handle that case.

Call `set_id()` on every box. The `dvdoug` library reads the id back through a
`string`-typed `getReference()`, so a box packed without one throws a `TypeError`.

The library name passed to `WC_Boxpack` is lower-cased and falls back to `original` when
it is not recognised, so a typo changes the packing strategy instead of erroring.

### Cart size limits

Both packers refuse a cart they can't pack in a few seconds, before they pack anything.
`pack()` then returns no packages, the same as when packing fails, and logs the reason to the
WooCommerce log (source `box-packer`).

A shipping method that adds up a cost per package must check for this: a cart with items and
no packages is a refused cart, not a free one.

| Filter | Default | Limits |
| -- | --: | -- |
| `woocommerce_box_packer_max_units` | 30,000 for a cart that takes the fast path, 3,000 otherwise | Units in the cart, summed over all lines |
| `woocommerce_box_packer_max_volume` | 1e15 (1,000,000 m³) | `dvdoug` only. Total item volume in mm³. Values above 1e18 are capped at 1e18, because dvdoug sums volumes as an `int` |

A cart takes the fast path when it has one line: on any PHP version with the `original`
packer, and on PHP 8+ with the `dvdoug` packer. Both filters get the packer as their second
argument, and `woocommerce_box_packer_max_units` gets whether the cart takes the fast path as
its third.

To turn the unit limit off, return `INF` from `woocommerce_box_packer_max_units`. For both
filters, a value that is not a number above 0 (`null`, `false`, `''`, `0`) keeps the default, so a
callback that returns nothing for some carts does not refuse them.

The defaults keep packing to about 2 s of CPU time (measured on a desktop CPU; FedEx and USPS
flat rate boxes, one product or four products):

| Cart | Packer | At the limit |
| -- | -- | --: |
| 3,000 units, one product, PHP 7.4 | `dvdoug` | 0.9–1.5 s |
| 3,000 units, four products | `dvdoug` | 1.8–2.0 s |
| 3,000 units, four products | `original` | 1.4–1.6 s |
| 30,000 units, one product, PHP 8 | `dvdoug` | 0.4 s, or about 2.3 s when the item fits no box |
| 30,000 units, one product | `original` | 0.6 s, plus up to 1 s to read every package's `unpacked` |

Above the limits, time grows at least linearly with the unit count. An extension can still set
lower limits of its own.

Mixed carts on the `original` packer cost more when each box takes few units, because each package
keeps its own `unpacked` list. Memory and time then grow with units × packages (3,000 units, two or
four lines):

| Cart | Packages | PHP 8.3 | PHP 7.4 |
| -- | --: | --: | --: |
| FedEx boxes, 2 in and 4 in cubes | 77–143 | 3–5 MB | 6–10 MB |
| USPS Express envelopes, 2 units per envelope | 750 | 27 MB | 54 MB |
| USPS Express envelopes, 1 unit per envelope | 3,000 | 84 MB, 1.1 s | 218 MB, 5.5 s |

The last cart runs out of memory on PHP 7.4 with a 128M limit, as it does on 1.4.0. A limit of
2,000 units keeps that cart to 94 MB on PHP 7.4. The `dvdoug` packer uses under 10 MB for it.

### Bundled dependencies

`dvdoug/boxpacker` and `psr/log` are not runtime dependencies. They ship inside this
repository under `lib/`, prefixed to `WooCommerce\BoxPacker\Vendor\*` by
[php-scoper](https://github.com/humbug/php-scoper).

This is not tidiness. Every shipping extension's Jetpack Autoloader registers whatever
`Psr\Log\*` it finds **globally**, at 1.1.4. Roots/Acorn and anything else bundling
Monolog 3 needs the psr/log 3.x signatures, only one `Psr\Log\LoggerInterface` can exist
per process, and the loser fatals. Shipping psr/log 3 instead is not possible while the
extensions declare `Requires PHP: 7.4`, because psr/log 2 and 3 require PHP 8.0. Prefixing
the bundled copy takes this library out of that contest entirely.

The public `WooCommerce\BoxPacker\*` namespace is excluded from the prefixing, so
consuming extensions never reference a prefixed name.

#### Packaging them

`lib/` is the packing engine, not an optional extra. An extension that filters this
package out of its release archive and re-includes only `src/` has to re-include `lib/`
as well:

```json
"/vendor/woocommerce/box-packer",
"!/vendor/woocommerce/box-packer/src",
"!/vendor/woocommerce/box-packer/lib"
```

Without that line the zip carries the public API with nothing behind it and fatals on the
first rate calculation, while dev installs and CI stay green because they install from
source rather than from the archive. Build the zip and check `lib/` is in it.

#### Refreshing them

After changing `dvdoug/boxpacker` or `psr/log` in `composer.json` — or `scoper.inc.php`
itself — regenerate `lib/` and commit the result:

```
composer install --optimize-autoloader
composer scope
git add lib composer.json composer.lock
```

`composer scope` needs **PHP 8.2 or newer**, because php-scoper does. That is a maintainer
and CI requirement only; the library itself still installs and runs on the 7.4 floor. The
scoper lives in its own Composer project under `tools/php-scoper` for exactly that reason:
it cannot go in `require-dev` without breaking `composer install` against the PHP 7.4
platform pin, and that pin has to stay, because this lockfile ships inside every consuming
extension.

The `Scoped output` CI job regenerates `lib/` on every pull request and fails if the
result differs from what is committed, so the generated code cannot silently rot.

#### The dvdoug patch

The bundled `dvdoug/boxpacker` is 3.9.3 plus one patch,
`patches/dvdoug-boxpacker-3.9.3-itemlist-rle.patch`, which `composer scope` applies to the
prefixed copy. Upstream stores every unit as its own list entry, so a line with a large
quantity costs time for every unit on every pass. The patch stores runs of identical items
with a count and moves whole runs at once. The packing result is unchanged.

The patch is kept here instead of in a fork because upstream cannot take it: 3.x gets no
more releases, and 4.x needs PHP 8.2. The pinned 3.9.3 does not change, so the patch does
not need rebasing. If a scoper upgrade changes the generated code, the patch fails to apply
and `composer scope` stops, so the drift check fails loudly instead of shipping an
unpatched copy. Do not bump dvdoug without re-measuring: 3.12.1 is 1.2 to 5 times slower
than 3.9.3 for our carts.

### Tests

```
composer install --optimize-autoloader
./vendor/bin/phpunit
```

CI runs the suite against PHP 7.4 through 8.4 on every pull request.

The golden-master test (`tests/class-golden-master-test.php`) packs about 2,300 fixed carts
with each packer and compares the full result with digests produced by box-packer 1.3.0.
Every change to the packers must keep it green. If a change to the packing result is
intended, regenerate the expected files with `tests/golden/generate.php` and say so in the
changelog, because the packing result decides the rates merchants show at checkout.
On PHP 7.4, 1.3.0 itself packs some carts differently, because PHP 7's sort is not stable.
Those cases are listed again in `expected-<library>-php7.txt`, which overrides the main file on PHP 7.
