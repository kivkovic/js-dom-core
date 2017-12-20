class DOMObject {

    constructor (reference) {
        if (reference instanceof DOMObject) {
            return reference;
        }

        if (reference === window || reference === document || reference instanceof HTMLElement) {
            this.nodes = [reference];
            this.selector = null;

        } else if (reference instanceof NodeList || reference.constructor === Array) {
            this.nodes = Array.prototype.slice.call(reference);
            this.selector = null;

        } else if (reference.constructor === String) {
            this.selector = reference;
            this.load();

        } else {
            throw new Exception('Invalid argument: ' + reference);
        }
    }

    map(callback) {
        let result = new DOMObject();
        result.nodes = this.nodes.map((node) => callback(new DOMObject(node)));
        return result;
    }

    forEach(callback) {
        this.nodes.forEach((node) => callback(new DOMObject(node)));
        return this;
    }

    create() {
        this.nodes = [document.createElement(this.selector)];
        return this;
    }

    load() {
        if (this.selector) {
            const nodes = document.querySelectorAll(this.selector);
            this.nodes = nodes instanceof NodeList
                ? Array.prototype.slice.call(nodes)
                : [];
        }
        return this;
    }

    get(index) {
        return new DOMObject(index === undefined ? this.nodes : this.nodes[index]);
    }

    remove() {
        this.nodes.map((element) => element.parentNode.removeChild(element));
        this.nodes = [];
        return this;
    }

    parent() {
        let parent = new DOMObject(),
            parents = [];
        parent.nodes = this.nodes.map((element) => element.parentNode);
        return parent;
    }

    children(selector = null) {
        let child = new DOMObject(),
            children = [];
        this.nodes.forEach(function (element) {
            children = children.concat(
                Array.prototype.slice.call(
                    selector ? element.querySelectorAll(selector) : element.children
                )
            );
        });
        child.nodes = children;
        return child;
    }

    addChild(node) {
        const targets = node instanceof DOMObject
            ? node.nodes
            : node.constructor === String
                ? [document.createTextNode(node)]
                : [node];

        this.nodes.forEach((node) => {
            targets.forEach((target) => node.appendChild(target));
        });

        return this;
    }

    eventFunction(fn, event, callback) {
        const events = event.constructor === Array ? event : [event];
        this.nodes.forEach((node) => {
            events.forEach((event) => {
                node[fn](event, callback && callback.bind(new DOMObject(node)));
            });
        });

        return this;
    }

    bind(event, callback) {
        return this.eventFunction('addEventListener', event, callback);
    }

    unbind(event) {
        return this.eventFunction('removeEventListener', event);
    }

    trigger(event) {
        const trigger_event = event instanceof Event ? event : new Event(event);
        this.nodes.forEach((node) => {
            if (event.constructor === String && node[event]) {
                node[event]();
            } else {
                node.dispatchEvent(trigger_event);
            }
        });
    }

    onReady(callback, timer = 50) {

        if (this.nodes.length && this.nodes[0] === window) {
            if (document.readyState !== 'complete') {
                window.addEventListener('load', callback, false);
            } else {
                callback();
            }

        } else if (this.nodes.length && this.nodes[0] === document) {
            if (document.readyState !== 'complete') {
                document.addEventListener('DOMContentLoaded', callback, false);
            } else {
                callback();
            }

        } else {
            var wait;
            wait = setInterval(() => {
                this.load();
                if (!this.nodes.length) {
                    return;
                }
                clearInterval(wait);
                this.nodes.forEach((node) => callback(new DOMObject(node)));
            }, timer);
        }

        return this;
    }

    get classes() {
        const classes = [];
        this.nodes.forEach((node) => {
            node.className.split(' ').forEach((className) => {
                if (className) classes.push(className);
            });
        });

        return classes;
    }

    set classes(values) {
        this.nodes.forEach((node) => {
            node.className = Array.from(values).join(' ');
        });
    }

    focus(index = 0) {
        this.nodes[index].focus();
        return this;
    }
}

function DOM (target) {
    return new DOMObject(target);
}

(setupGettersSetters = (className) => {

    if (className.prototype.setup === 'done') return;
    className.prototype.setup = 'done';

    const properties = {
        id:       'id',
        dataset:  'dataset',
        type:     'type',
        src:      'src',
        title:    'title',
        text:     'innerText',
        html:     'outerHTML',
        style:    'style',
        width:    'offsetWidth',
        height:   'offsetHeight',
        top:      'offsetTop',
        right:    'offsetRight',
        bottom:   'offsetBottom',
        left:     'offsetLeft',
        read_only:'readOnly',
    };

    const attributes = { name: 'name' };

    const values = { value: 'value' };

    const setup = function (properties, getter, setter) {
        for (const property in properties) {
            Object.defineProperty(className.prototype, property, {
                get: function() {
                    return this.nodes.map((node) => getter(node, properties[property]));
                },
                set: function(value) {
                    this.nodes.forEach((node) => setter(node, properties[property], value));
                }
            });
        }
    };

    setup(properties,
        (node, key) => node[key],
        (node, key, value) => node[key] = value);

    setup(attributes,
        (node, key) => node.getAttribute(key),
        (node, key, value) => node.setAttribute(key, value));

    setup(values,
        (node, key) => (node.tagName == 'INPUT' || node.tagName == 'TEXTAREA'
            ? node.value : node.innerHTML),
        (node, key, value) => (node.tagName == 'INPUT' || node.tagName == 'TEXTAREA'
            ? (node.value = value) : (node.innerHTML = value)));

})(DOMObject);

if (typeof exports !== 'undefined' ) {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = DOM;
    }
    exports.DOM = DOM;
}
