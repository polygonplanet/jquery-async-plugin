jQuery async plugin
===================

jQuery async plugin adds **Deferred** to handle like the [Mochikit.Async.Deferred](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred).

This plugin adds the Deferred functions to jQuery.Deferred object, but it does not conflict with other plugins.
jQuery.Deferred keeps original functions.
jQuery object is added only **async** function object.


## Installation

Include script after the jQuery library:

```html
<script src="/path/to/jquery.async.js"></script>
or
<script src="/path/to/jquery.async.min.js"></script>
```

$.async() is a shortcut function faster way of creating new Deferred sequence.

```javascript
$.async(function() {
    console.log('Start Deferred chain');
}).addCallback(function() {
    console.log('End Deferred chain');
});
```

## Usage

The basic usage is the same as the Mochikit.Async.Deferred.


Simple Deferred chain:

```javascript
var d = $.Deferred();
d.addCallback(function() {
    return 1;
}).addCallback(function(res) {
    console.log(res); // 1
});
d.callback();
```

Using [succeed](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-succeed)():

```javascript
$.async.succeed(1).addCallback(function(res) {
    return res + 1;
}).addCallback(function(res) {
    console.log(res); // 2
});
```

Passing Values and Error handling:

```javascript
$.async(function() {
    return 1;
}).addCallback(function(res) {
    console.log(res); // 1
    throw new Error('error');
}).addCallback(function(res) {
    console.log('This message does not show');
    return 'noop';
}).addErrback(function(err) {
    console.log(err); // error
    return 'hello';
}).addBoth(function(res) {
    console.log(res); // hello
});
```

## Function reference

*Portions of this document are reference from MochiKit.*

### $.Deferred() *Deferred*

The Deferred object usage is the same as the jQuery.Deferred.

```javascript
var d = $.Deferred();
```

The following callback methods has been added.

#### [addCallback](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.addcallback)( *function* callback) *Deferred*

Add a single callback to the end of the callback sequence.

#### [addErrback](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.adderrback)( *function* errback) *Deferred*

Add a single errback to the end of the callback sequence.

#### [addBoth](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.addboth)( *function* func) *Deferred*

Add the same function as both a callback and an errback as the next element on the callback sequence. This is useful for code that you want to guarantee to run.

#### [addCallbacks](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.addcallbacks)( *function* callback, *function* errback) *Deferred*

Add separate callback and errback to the end of the callback sequence. Either callback or errback may be null, but not both.

#### [callback](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.callback)([ \* result]) *Deferred*

Begin the callback sequence with a non-Error result. Result may be any value except for a Deferred.

#### [errback](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.errback)([ \* result]) *Deferred*

Begin the callback sequence with an error result. Result may be any value except for a Deferred.

#### [cancel](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred.prototype.cancel)() *Deferred*

Cancels a Deferred that has not yet received a value, or is waiting on another Deferred as its value.

```javascript
var d = $.Deferred();
d.addCallback() {
    return 1;
}).addCallback(res) {
    console.log(res); // 1
    throw 'ExampleError';
}).addCallback(function() {
    neverHappen();
}).addErrback(function(err) {
    console.log(err); // ExampleError
}).addCallback(function() {
    if (Math.random() * 10 > 5) {
        throw 'RandomError';
    }
    return 'random test';
}).addBoth(function(res) {
    console.log(res); // RandomError or 'random test'
});
// fire chain
d.callback();
```

#### $.async( *function* func) *Deferred*

A shortcut faster way of creating new Deferred sequence.

```javascript
$.async(function() {
    console.log('Start Deferred chain');
}).addCallback(function() {
    console.log('End Deferred chain');
});
```

#### $.async.[succeed](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-succeed)([ \* result]) *Deferred*

Return a Deferred that has already had .callback(result) called.

```javascript
$.async.succeed(1).addCallback(function(res) {
    console.log(res); // 1
});
```

#### $.async.[fail](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-fail)([ \* result]) *Deferred*

Return a Deferred that has already had .errback(result) called.

```javascript
$.async.fail(1).addErrback(function(err) {
    console.log(err); // Error: 1
});
```

#### $.async.[maybeDeferred](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-maybedeferred)( \* func) *Deferred*

Call a func with the given arguments and ensure the result is a Deferred.

```javascript
var d = $.async.succeed(1);
var s = 'abc';
var random = (Math.random() * 10 < 5);
$.async.maybeDeferred( random ? d : s ).addCallback(function(res) {
    console.log(res); // 1 or 'abc'
});
```

#### $.async.maybeDeferreds( \* ...args) *Array*

Return an array of Deferred instances.

```javascript
var list = $.async.maybeDeferreds(
    1, 2, 'foo', 'bar',
    function() { return 5 },
    $.async.succeed(100)
);
console.log(list); // [ 1, 2, ... (deferred instances) ]
list[0].addCallback(function(res) {
    console.log(res); // 1
});
```

#### $.async.[wait](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-wait)( *number* seconds[, \* res]) *Deferred*

Return a new cancellable Deferred that will .callback(res) after at least seconds seconds have elapsed.

```javascript
// Called after 5 seconds.
$.async.wait(5).addCallback(function() {
    console.log('Begin wait() test');
}).addCallback(function() {
    return $.async.wait(2); // Wait 2 seconds.
}).addCallback(function() {
    console.log('End wait() test');
});
```

#### $.async.[callLater](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-calllater)( *number* seconds, *funcion* func[, \* args...]) *Deferred*

Call func(args...) after at least seconds seconds have elapsed.

```javascript
var value = null;
// Called after 1 second.
$.async.callLater(1, function() {
    value = 'hoge';
});
console.log(value); // null
$.async.callLater(1, function() {
    console.log(value); // 'hoge'
});
```

#### $.async.till( *function* cond) *Deferred*

Wait until the condition completed. If true returned, waiting state will end.

```javascript
console.log('Begin till');
$.async.till(function() {
    // wait until the DOM body element is loaded
    if (!document.body) {
        return false;
    } else {
        return true;
    }
}).addCallback(function() {
    console.log('End till');
    document.body.innerHTML += 'Hello';
});
```

## License

Licensed under the MIT license.

## Authors

* [polygon planet](https://github.com/polygonplanet) (twitter: [polygon_planet](http://twitter.com/polygon_planet))



