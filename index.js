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
            this.nodes = [];
            this.selector = reference;
            this.nodes = this.fetch(reference);

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

    fetch(selector) {
        const nodes = document.querySelectorAll(selector);
        if (nodes instanceof NodeList) {
            nodes = Array.prototype.slice.call(nodes);
        }
        return nodes;
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

        this.nodes.forEach((element) => {
            let targets = node instanceof DOMObject
                ? node.nodes
                : node.constructor === String
                    ? [document.createTextNode(node)]
                    : [node];
            targets.forEach((target) => element.appendChild(target));
        });
        return this;
    }

    bind(event, callback) {
        let events = event.constructor === Array ? event : [event];

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
        let trigger_event = event instanceof Event ? event : new Event(event);
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
            this.nodes = this.selector && this.fetch(this.selector);
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
