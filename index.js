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

    bind(event, callback) {
        const events = event.constructor === Array ? event : [event];

        if (this.nodes.length) {
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = 0; j < events.length; j++) {
                    this.nodes[i].addEventListener(events[j], callback.bind(new DOMObject(this.nodes[i])));
                }
            }
        }

        return this;
    }

    unbind(event) {
        if (this.nodes.length) {
            for (let i = 0; i < this.nodes.length; i++) {
                this.nodes[i].removeEventListener(event);
            }
        }

        return this;
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

    onReady(callback, timer) {

        if (this.nodes.length && (this.nodes[0] === window || this.nodes[0] === document)) { // move to for loop
            window._load_blocker = false;

            let locked_callback = (function (callback) {
                if (window._load_blocker) return;
                window._load_blocker = true;
                callback.call(window);
            }).bind(window, callback);

            document.addEventListener('DOMContentLoaded', locked_callback, false);
            window.addEventListener('load', locked_callback, false);
            return this;
        }

        var wait;
        const check = () => {
            this.load();
            if (this.nodes && this.nodes.length) {
                clearInterval(wait);
                for (let i = 0; i < this.nodes.length; i++) {
                    callback.call(new DOMObject(this.nodes[i]));
                }
            }
        }
        wait = setInterval(check, timer > 0 ? timer : 10);

        return this;
    }

    addClass(class_name) {
        this.nodes.forEach((node) => node.className.search(class_name) == -1 ? node.className += ` ${class_name}` : 0);
        return this;
    }

    replaceClass(from_class, to_class) {
        this.nodes.forEach((node) => node.className = node.className.replace(from_class, to_class));
        return this;
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
    const properties = {
        id:       'id',
        class:    'className',
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

    const attributes = {
        name: 'name'
    };

    const values = {
        value: 'value'
    }

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

    setup(properties, (node, key) => node[key], (node, key, value) => node[key] = value);
    setup(attributes, (node, key) => node.getAttribute(key), (node, key, value) => node.setAttribute(key, value));
    setup(values,
        (node, key) => (node.tagName == 'INPUT' || node.tagName == 'TEXTAREA' ? node.value : node.innerHTML),
        (node, key, value) => (node.tagName == 'INPUT' || node.tagName == 'TEXTAREA' ? (node.value = value) : (node.innerHTML = value))
    );

})(DOMObject);
