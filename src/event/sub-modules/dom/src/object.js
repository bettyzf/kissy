/**
 * @ignore
 * @fileOverview event object for dom
 * @author yiminghe@gmail.com
 */
KISSY.add('event/dom/object', function (S, Event) {

    var doc = S.Env.host.document,
        TRUE = true,
        FALSE = false,
        props = ('type altKey attrChange attrName bubbles button cancelable ' +
            'charCode clientX clientY ctrlKey currentTarget data detail ' +
            'eventPhase fromElement handler keyCode metaKey ' +
            'newValue offsetX offsetY originalTarget pageX pageY prevValue ' +
            'relatedNode relatedTarget screenX screenY shiftKey srcElement ' +
            'target toElement view wheelDelta which axis').split(' ');

    /**
     * @class KISSY.Event.Object
     *
     * KISSY 's event system normalizes the event object according to
     * W3C standards. The event object is guaranteed to be passed to
     * the event handler. Most properties from the original event are
     * copied over and normalized to the new event object.
     */
    function DOMEventObject(domEvent) {
        var self = this;
        self.originalEvent = domEvent;
        // in case dom event has been mark as default prevented by lower dom node
        self.isDefaultPrevented = ( domEvent['defaultPrevented'] || domEvent.returnValue === FALSE ||
            domEvent['getPreventDefault'] && domEvent['getPreventDefault']() ) ? function(){
            return TRUE;
        } : function(){
            return FALSE;
        };
        fix(self);
        fixMouseWheel(self);
    }

    function fix(self) {
        var originalEvent = self.originalEvent,
            l = props.length,
            prop,
            ct = self.currentTarget,
            ownerDoc = (ct.nodeType === 9) ? ct : (ct.ownerDocument || doc); // support iframe

        // clone properties of the original event object
        while (l) {
            prop = props[--l];
            self[prop] = originalEvent[prop];
        }

        // fix target property, if necessary
        if (!self.target) {
            self.target = self.srcElement || ownerDoc; // srcElement might not be defined either
        }

        // check if target is a text node (safari)
        if (self.target.nodeType === 3) {
            self.target = self.target.parentNode;
        }

        // add relatedTarget, if necessary
        if (!self.relatedTarget && self.fromElement) {
            self.relatedTarget = (self.fromElement === self.target) ? self.toElement : self.fromElement;
        }

        // calculate pageX/Y if missing and clientX/Y available
        if (self.pageX === undefined && self.clientX !== undefined) {
            var docEl = ownerDoc.documentElement, bd = ownerDoc.body;
            self.pageX = self.clientX + (docEl && docEl.scrollLeft || bd && bd.scrollLeft || 0) - (docEl && docEl.clientLeft || bd && bd.clientLeft || 0);
            self.pageY = self.clientY + (docEl && docEl.scrollTop || bd && bd.scrollTop || 0) - (docEl && docEl.clientTop || bd && bd.clientTop || 0);
        }

        // add which for key events
        if (self.which === undefined) {
            self.which = (self.charCode === undefined) ? self.keyCode : self.charCode;
        }

        // add metaKey to non-Mac browsers (use ctrl for PC's and Meta for Macs)
        if (self.metaKey === undefined) {
            self.metaKey = self.ctrlKey;
        }

        // add which for click: 1 === left; 2 === middle; 3 === right
        // Note: button is not normalized, so don't use it
        if (!self.which && self.button !== undefined) {
            self.which = (self.button & 1 ? 1 : (self.button & 2 ? 3 : ( self.button & 4 ? 2 : 0)));
        }
    }

    function fixMouseWheel(e) {
        var deltaX,
            deltaY,
            delta,
            detail = e.detail;

        if (e.wheelDelta) {
            delta = e.wheelDelta / 120;
        }
        if (e.detail) {
            // press control e.detail == 1 else e.detail == 3
            delta = -(detail % 3 == 0 ? detail / 3 : detail);
        }

        // Gecko
        if (e.axis !== undefined) {
            if (e.axis === e['HORIZONTAL_AXIS']) {
                deltaY = 0;
                deltaX = -1 * delta;
            } else if (e.axis === e['VERTICAL_AXIS']) {
                deltaX = 0;
                deltaY = delta;
            }
        }

        // Webkit
        if (e['wheelDeltaY'] !== undefined) {
            deltaY = e['wheelDeltaY'] / 120;
        }
        if (e['wheelDeltaX'] !== undefined) {
            deltaX = -1 * e['wheelDeltaX'] / 120;
        }

        // 默认 deltaY ( ie )
        if (!deltaX && !deltaY) {
            deltaY = delta;
        }

        S.mix(e, {
            deltaY: deltaY,
            delta: delta,
            deltaX: deltaX,
            type: 'mousewheel'
        });
    }

    S.extend(DOMEventObject, Event._Object, {
        constructor: DOMEventObject,
        /**
         * Prevents the event's default behavior
         */
        preventDefault: function () {
            var e = this.originalEvent;

            // if preventDefault exists run it on the original event
            if (e.preventDefault) {
                e.preventDefault();
            }
            // otherwise set the returnValue property of the original event to FALSE (IE)
            else {
                e.returnValue = FALSE;
            }

            DOMEventObject.superclass.preventDefault.call(this);
        },
        /**
         * Stops the propagation to the next bubble target
         */
        stopPropagation: function () {
            var e = this.originalEvent;

            // if stopPropagation exists run it on the original event
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            // otherwise set the cancelBubble property of the original event to TRUE (IE)
            else {
                e.cancelBubble = TRUE;
            }

            DOMEventObject.superclass.stopPropagation.call(this);
        }
    });

    return DOMEventObject;

}, {
    requires: ['event/base']
});

/*
 merge with mousewheel:
 not perfect in osx : accelerated scroll

 refer:
 https://github.com/brandonaaron/jquery-mousewheel/blob/master/jquery.mousewheel.js
 http://www.planabc.net/2010/08/12/mousewheel_event_in_javascript/
 http://www.switchonthecode.com/tutorials/javascript-tutorial-the-scroll-wheel
 http://stackoverflow.com/questions/5527601/normalizing-mousewheel-speed-across-browsers/5542105#5542105
 http://www.javascriptkit.com/javatutors/onmousewheel.shtml
 http://www.adomas.org/javascript-mouse-wheel/
 http://plugins.jquery.com/project/mousewheel
 http://www.cnblogs.com/aiyuchen/archive/2011/04/19/2020843.html
 http://www.w3.org/TR/DOM-Level-3-Events/#events-mousewheelevents
 */

/*
 http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
 */