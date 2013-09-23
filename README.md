jQuery async plugin
===================

jQuery async plugin add **Deferred** to handle like the [Mochikit.Async.Deferred](http://mochi.github.io/mochikit/doc/html/MochiKit/Async.html#fn-deferred).

## Installation

Include script after the jQuery library:

    ```html
    <script src="/path/to/jquery.async.js"></script>
    ```

This plugin adds **async** function to jQuery object.

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
    }).callback();
    ```

## License

Licensed under the MIT license.

## Authors

* [polygon planet](https://github.com/polygonplanet) (twitter: [polygon_planet](http://twitter.com/polygon_planet))



