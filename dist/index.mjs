function noop() { }
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function exclude_internal_props(props) {
    const result = {};
    for (const k in props)
        if (k[0] !== '$')
            result[k] = props[k];
    return result;
}
function null_to_empty(value) {
    return value == null ? '' : value;
}

function append(target, node) {
    target.appendChild(node);
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    node.parentNode.removeChild(node);
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text(data) {
    return document.createTextNode(data);
}
function space() {
    return text(' ');
}
function empty() {
    return text('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function to_number(value) {
    return value === '' ? undefined : +value;
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data !== data)
        text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    node.style.setProperty(key, value, important ? 'important' : '');
}
function select_option(select, value) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
}
function select_value(select) {
    const selected_option = select.querySelector(':checked') || select.options[0];
    return selected_option && selected_option.__value;
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
}
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
}

function destroy_block(block, lookup) {
    block.d(1);
    lookup.delete(block.key);
}
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            block.p(child_ctx, dirty);
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    return new_blocks;
}

function get_spread_update(levels, updates) {
    const update = {};
    const to_null_out = {};
    const accounted_for = { $$scope: 1 };
    let i = levels.length;
    while (i--) {
        const o = levels[i];
        const n = updates[i];
        if (n) {
            for (const key in o) {
                if (!(key in n))
                    to_null_out[key] = 1;
            }
            for (const key in n) {
                if (!accounted_for[key]) {
                    update[key] = n[key];
                    accounted_for[key] = 1;
                }
            }
            levels[i] = n;
        }
        else {
            for (const key in o) {
                accounted_for[key] = 1;
            }
        }
    }
    for (const key in to_null_out) {
        if (!(key in update))
            update[key] = undefined;
    }
    return update;
}
function get_spread_object(spread_props) {
    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    // onMount happens before the initial afterUpdate
    add_render_callback(() => {
        const new_on_destroy = on_mount.map(run).filter(is_function);
        if (on_destroy) {
            on_destroy.push(...new_on_destroy);
        }
        else {
            // Edge case - component was destroyed immediately,
            // most likely as a result of a binding initialising
            run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set() {
        // overridden by instance, if it has props
    }
}

/* node_modules/svelte-icons/components/IconBase.svelte generated by Svelte v3.23.2 */

function add_css() {
	var style = element("style");
	style.id = "svelte-c8tyih-style";
	style.textContent = "svg.svelte-c8tyih{stroke:currentColor;fill:currentColor;stroke-width:0;width:100%;height:auto;max-height:100%}";
	append(document.head, style);
}

// (18:2) {#if title}
function create_if_block(ctx) {
	let title_1;
	let t;

	return {
		c() {
			title_1 = svg_element("title");
			t = text(/*title*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, title_1, anchor);
			append(title_1, t);
		},
		p(ctx, dirty) {
			if (dirty & /*title*/ 1) set_data(t, /*title*/ ctx[0]);
		},
		d(detaching) {
			if (detaching) detach(title_1);
		}
	};
}

function create_fragment(ctx) {
	let svg;
	let if_block_anchor;
	let current;
	let if_block = /*title*/ ctx[0] && create_if_block(ctx);
	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

	return {
		c() {
			svg = svg_element("svg");
			if (if_block) if_block.c();
			if_block_anchor = empty();
			if (default_slot) default_slot.c();
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "viewBox", /*viewBox*/ ctx[1]);
			attr(svg, "class", "svelte-c8tyih");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			if (if_block) if_block.m(svg, null);
			append(svg, if_block_anchor);

			if (default_slot) {
				default_slot.m(svg, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (/*title*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block(ctx);
					if_block.c();
					if_block.m(svg, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 4) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, null, null);
				}
			}

			if (!current || dirty & /*viewBox*/ 2) {
				attr(svg, "viewBox", /*viewBox*/ ctx[1]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(svg);
			if (if_block) if_block.d();
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let { title = null } = $$props;
	let { viewBox } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("title" in $$props) $$invalidate(0, title = $$props.title);
		if ("viewBox" in $$props) $$invalidate(1, viewBox = $$props.viewBox);
		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	return [title, viewBox, $$scope, $$slots];
}

class IconBase extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-c8tyih-style")) add_css();
		init(this, options, instance, create_fragment, safe_not_equal, { title: 0, viewBox: 1 });
	}
}

/* node_modules/svelte-icons/fa/FaSpinner.svelte generated by Svelte v3.23.2 */

function create_default_slot(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M304 48c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48zm-48 368c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zm208-208c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48zM96 256c0-26.51-21.49-48-48-48S0 229.49 0 256s21.49 48 48 48 48-21.49 48-48zm12.922 99.078c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48c0-26.509-21.491-48-48-48zm294.156 0c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48c0-26.509-21.49-48-48-48zM108.922 60.922c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.491-48-48-48z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

function create_fragment$1(ctx) {
	let iconbase;
	let current;
	const iconbase_spread_levels = [{ viewBox: "0 0 512 512" }, /*$$props*/ ctx[0]];

	let iconbase_props = {
		$$slots: { default: [create_default_slot] },
		$$scope: { ctx }
	};

	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
	}

	iconbase = new IconBase({ props: iconbase_props });

	return {
		c() {
			create_component(iconbase.$$.fragment);
		},
		m(target, anchor) {
			mount_component(iconbase, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const iconbase_changes = (dirty & /*$$props*/ 1)
			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
			: {};

			if (dirty & /*$$scope*/ 2) {
				iconbase_changes.$$scope = { dirty, ctx };
			}

			iconbase.$set(iconbase_changes);
		},
		i(local) {
			if (current) return;
			transition_in(iconbase.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(iconbase.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(iconbase, detaching);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	$$self.$set = $$new_props => {
		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
	};

	$$props = exclude_internal_props($$props);
	return [$$props];
}

class FaSpinner extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
	}
}

/* src/JoSpinner.svelte generated by Svelte v3.23.2 */

function create_fragment$2(ctx) {
	let div1;
	let div0;
	let faspinner;
	let current;
	faspinner = new FaSpinner({});

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			create_component(faspinner.$$.fragment);
			attr(div0, "class", "text-indigo-600 spinner w-64 h-64");
			attr(div1, "class", "jo-spinner w-full p-24 my-2 flex justify-center");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			mount_component(faspinner, div0, null);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(faspinner.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(faspinner.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(faspinner);
		}
	};
}

class JoSpinner extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$2, safe_not_equal, {});
	}
}

/* node_modules/svelte-icons/md/MdWarning.svelte generated by Svelte v3.23.2 */

function create_default_slot$1(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

function create_fragment$3(ctx) {
	let iconbase;
	let current;
	const iconbase_spread_levels = [{ viewBox: "0 0 24 24" }, /*$$props*/ ctx[0]];

	let iconbase_props = {
		$$slots: { default: [create_default_slot$1] },
		$$scope: { ctx }
	};

	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
	}

	iconbase = new IconBase({ props: iconbase_props });

	return {
		c() {
			create_component(iconbase.$$.fragment);
		},
		m(target, anchor) {
			mount_component(iconbase, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const iconbase_changes = (dirty & /*$$props*/ 1)
			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
			: {};

			if (dirty & /*$$scope*/ 2) {
				iconbase_changes.$$scope = { dirty, ctx };
			}

			iconbase.$set(iconbase_changes);
		},
		i(local) {
			if (current) return;
			transition_in(iconbase.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(iconbase.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(iconbase, detaching);
		}
	};
}

function instance$2($$self, $$props, $$invalidate) {
	$$self.$set = $$new_props => {
		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
	};

	$$props = exclude_internal_props($$props);
	return [$$props];
}

class MdWarning extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$2, create_fragment$3, safe_not_equal, {});
	}
}

/* src/JoErrorPane.svelte generated by Svelte v3.23.2 */

function create_fragment$4(ctx) {
	let div2;
	let div0;
	let mdwarning;
	let t0;
	let div1;
	let t1;
	let current;
	mdwarning = new MdWarning({});

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			create_component(mdwarning.$$.fragment);
			t0 = space();
			div1 = element("div");
			t1 = text(/*message*/ ctx[0]);
			attr(div0, "class", "h-32 w-32 text-gray-700");
			attr(div1, "class", "text-red-700 font-bold text-xl");
			attr(div2, "class", "w-full p-12 flex flex-col items-center justify-center bg-gray-200");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			mount_component(mdwarning, div0, null);
			append(div2, t0);
			append(div2, div1);
			append(div1, t1);
			current = true;
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*message*/ 1) set_data(t1, /*message*/ ctx[0]);
		},
		i(local) {
			if (current) return;
			transition_in(mdwarning.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(mdwarning.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div2);
			destroy_component(mdwarning);
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let { message } = $$props;

	$$self.$set = $$props => {
		if ("message" in $$props) $$invalidate(0, message = $$props.message);
	};

	return [message];
}

class JoErrorPane extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$4, safe_not_equal, { message: 0 });
	}
}

/* src/JoAsyncContent.svelte generated by Svelte v3.23.2 */
const get_ready_slot_changes = dirty => ({});
const get_ready_slot_context = ctx => ({});
const get_success_slot_changes = dirty => ({});
const get_success_slot_context = ctx => ({});

// (15:37) 
function create_if_block_3(ctx) {
	let joerrorpane;
	let current;

	joerrorpane = new JoErrorPane({
			props: { message: /*errorMessage*/ ctx[1] }
		});

	return {
		c() {
			create_component(joerrorpane.$$.fragment);
		},
		m(target, anchor) {
			mount_component(joerrorpane, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const joerrorpane_changes = {};
			if (dirty & /*errorMessage*/ 2) joerrorpane_changes.message = /*errorMessage*/ ctx[1];
			joerrorpane.$set(joerrorpane_changes);
		},
		i(local) {
			if (current) return;
			transition_in(joerrorpane.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(joerrorpane.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(joerrorpane, detaching);
		}
	};
}

// (13:39) 
function create_if_block_2(ctx) {
	let jospinner;
	let current;
	jospinner = new JoSpinner({});

	return {
		c() {
			create_component(jospinner.$$.fragment);
		},
		m(target, anchor) {
			mount_component(jospinner, target, anchor);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(jospinner.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(jospinner.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(jospinner, detaching);
		}
	};
}

// (11:37) 
function create_if_block_1(ctx) {
	let current;
	const ready_slot_template = /*$$slots*/ ctx[3].ready;
	const ready_slot = create_slot(ready_slot_template, ctx, /*$$scope*/ ctx[2], get_ready_slot_context);

	return {
		c() {
			if (ready_slot) ready_slot.c();
		},
		m(target, anchor) {
			if (ready_slot) {
				ready_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (ready_slot) {
				if (ready_slot.p && dirty & /*$$scope*/ 4) {
					update_slot(ready_slot, ready_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_ready_slot_changes, get_ready_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(ready_slot, local);
			current = true;
		},
		o(local) {
			transition_out(ready_slot, local);
			current = false;
		},
		d(detaching) {
			if (ready_slot) ready_slot.d(detaching);
		}
	};
}

// (9:0) {#if (networkStatus == 'success')}
function create_if_block$1(ctx) {
	let current;
	const success_slot_template = /*$$slots*/ ctx[3].success;
	const success_slot = create_slot(success_slot_template, ctx, /*$$scope*/ ctx[2], get_success_slot_context);

	return {
		c() {
			if (success_slot) success_slot.c();
		},
		m(target, anchor) {
			if (success_slot) {
				success_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (success_slot) {
				if (success_slot.p && dirty & /*$$scope*/ 4) {
					update_slot(success_slot, success_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_success_slot_changes, get_success_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(success_slot, local);
			current = true;
		},
		o(local) {
			transition_out(success_slot, local);
			current = false;
		},
		d(detaching) {
			if (success_slot) success_slot.d(detaching);
		}
	};
}

function create_fragment$5(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block$1, create_if_block_1, create_if_block_2, create_if_block_3];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*networkStatus*/ ctx[0] == "success") return 0;
		if (/*networkStatus*/ ctx[0] == "ready") return 1;
		if (/*networkStatus*/ ctx[0] == "loading") return 2;
		if (/*networkStatus*/ ctx[0] == "error") return 3;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(target, anchor);
			}

			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				} else {
					if_block = null;
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d(detaching);
			}

			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { networkStatus } = $$props;
	let { errorMessage = "terjadi kesalahan" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("networkStatus" in $$props) $$invalidate(0, networkStatus = $$props.networkStatus);
		if ("errorMessage" in $$props) $$invalidate(1, errorMessage = $$props.errorMessage);
		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
	};

	return [networkStatus, errorMessage, $$scope, $$slots];
}

class JoAsyncContent extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$4, create_fragment$5, safe_not_equal, { networkStatus: 0, errorMessage: 1 });
	}
}

function getBoundingClientRect(element) {
  var rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    x: rect.left,
    y: rect.top
  };
}

/*:: import type { Window } from '../types'; */

/*:: declare function getWindow(node: Node | Window): Window; */
function getWindow(node) {
  if (node.toString() !== '[object Window]') {
    var ownerDocument = node.ownerDocument;
    return ownerDocument ? ownerDocument.defaultView : window;
  }

  return node;
}

function getWindowScroll(node) {
  var win = getWindow(node);
  var scrollLeft = win.pageXOffset;
  var scrollTop = win.pageYOffset;
  return {
    scrollLeft: scrollLeft,
    scrollTop: scrollTop
  };
}

/*:: declare function isElement(node: mixed): boolean %checks(node instanceof
  Element); */

function isElement(node) {
  var OwnElement = getWindow(node).Element;
  return node instanceof OwnElement || node instanceof Element;
}
/*:: declare function isHTMLElement(node: mixed): boolean %checks(node instanceof
  HTMLElement); */


function isHTMLElement(node) {
  var OwnElement = getWindow(node).HTMLElement;
  return node instanceof OwnElement || node instanceof HTMLElement;
}

function getHTMLElementScroll(element) {
  return {
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop
  };
}

function getNodeScroll(node) {
  if (node === getWindow(node) || !isHTMLElement(node)) {
    return getWindowScroll(node);
  } else {
    return getHTMLElementScroll(node);
  }
}

function getNodeName(element) {
  return element ? (element.nodeName || '').toLowerCase() : null;
}

function getDocumentElement(element) {
  // $FlowFixMe: assume body is always available
  return (isElement(element) ? element.ownerDocument : element.document).documentElement;
}

function getWindowScrollBarX(element) {
  // If <html> has a CSS width greater than the viewport, then this will be
  // incorrect for RTL.
  // Popper 1 is broken in this case and never had a bug report so let's assume
  // it's not an issue. I don't think anyone ever specifies width on <html>
  // anyway.
  // Browsers where the left scrollbar doesn't cause an issue report `0` for
  // this (e.g. Edge 2019, IE11, Safari)
  return getBoundingClientRect(getDocumentElement(element)).left + getWindowScroll(element).scrollLeft;
}

function getComputedStyle(element) {
  return getWindow(element).getComputedStyle(element);
}

function isScrollParent(element) {
  // Firefox wants us to check `-x` and `-y` variations as well
  var _getComputedStyle = getComputedStyle(element),
      overflow = _getComputedStyle.overflow,
      overflowX = _getComputedStyle.overflowX,
      overflowY = _getComputedStyle.overflowY;

  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}

// Composite means it takes into account transforms as well as layout.

function getCompositeRect(elementOrVirtualElement, offsetParent, isFixed) {
  if (isFixed === void 0) {
    isFixed = false;
  }

  var documentElement = getDocumentElement(offsetParent);
  var rect = getBoundingClientRect(elementOrVirtualElement);
  var isOffsetParentAnElement = isHTMLElement(offsetParent);
  var scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  var offsets = {
    x: 0,
    y: 0
  };

  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== 'body' || // https://github.com/popperjs/popper-core/issues/1078
    isScrollParent(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }

    if (isHTMLElement(offsetParent)) {
      offsets = getBoundingClientRect(offsetParent);
      offsets.x += offsetParent.clientLeft;
      offsets.y += offsetParent.clientTop;
    } else if (documentElement) {
      offsets.x = getWindowScrollBarX(documentElement);
    }
  }

  return {
    x: rect.left + scroll.scrollLeft - offsets.x,
    y: rect.top + scroll.scrollTop - offsets.y,
    width: rect.width,
    height: rect.height
  };
}

// Returns the layout rect of an element relative to its offsetParent. Layout
// means it doesn't take into account transforms.
function getLayoutRect(element) {
  return {
    x: element.offsetLeft,
    y: element.offsetTop,
    width: element.offsetWidth,
    height: element.offsetHeight
  };
}

function getParentNode(element) {
  if (getNodeName(element) === 'html') {
    return element;
  }

  return (// $FlowFixMe: this is a quicker (but less type safe) way to save quite some bytes from the bundle
    element.assignedSlot || // step into the shadow DOM of the parent of a slotted node
    element.parentNode || // DOM Element detected
    // $FlowFixMe: need a better way to handle this...
    element.host || // ShadowRoot detected
    // $FlowFixMe: HTMLElement is a Node
    getDocumentElement(element) // fallback

  );
}

function getScrollParent(node) {
  if (['html', 'body', '#document'].indexOf(getNodeName(node)) >= 0) {
    // $FlowFixMe: assume body is always available
    return node.ownerDocument.body;
  }

  if (isHTMLElement(node) && isScrollParent(node)) {
    return node;
  }

  return getScrollParent(getParentNode(node));
}

/*
given a DOM element, return the list of all scroll parents, up the list of ancesors
until we get to the top window object. This list is what we attach scroll listeners
to, because if any of these parent elements scroll, we'll need to re-calculate the 
reference element's position.
*/

function listScrollParents(element, list) {
  if (list === void 0) {
    list = [];
  }

  var scrollParent = getScrollParent(element);
  var isBody = getNodeName(scrollParent) === 'body';
  var win = getWindow(scrollParent);
  var target = isBody ? [win].concat(win.visualViewport || [], isScrollParent(scrollParent) ? scrollParent : []) : scrollParent;
  var updatedList = list.concat(target);
  return isBody ? updatedList : // $FlowFixMe: isBody tells us target will be an HTMLElement here
  updatedList.concat(listScrollParents(getParentNode(target)));
}

function isTableElement(element) {
  return ['table', 'td', 'th'].indexOf(getNodeName(element)) >= 0;
}

function getTrueOffsetParent(element) {
  if (!isHTMLElement(element) || // https://github.com/popperjs/popper-core/issues/837
  getComputedStyle(element).position === 'fixed') {
    return null;
  }

  return element.offsetParent;
} // `.offsetParent` reports `null` for fixed elements, while absolute elements
// return the containing block


function getContainingBlock(element) {
  var currentNode = getParentNode(element);

  while (isHTMLElement(currentNode) && ['html', 'body'].indexOf(getNodeName(currentNode)) < 0) {
    var css = getComputedStyle(currentNode); // This is non-exhaustive but covers the most common CSS properties that
    // create a containing block.

    if (css.transform !== 'none' || css.perspective !== 'none' || css.willChange !== 'auto') {
      return currentNode;
    } else {
      currentNode = currentNode.parentNode;
    }
  }

  return null;
} // Gets the closest ancestor positioned element. Handles some edge cases,
// such as table ancestors and cross browser bugs.


function getOffsetParent(element) {
  var window = getWindow(element);
  var offsetParent = getTrueOffsetParent(element);

  while (offsetParent && isTableElement(offsetParent) && getComputedStyle(offsetParent).position === 'static') {
    offsetParent = getTrueOffsetParent(offsetParent);
  }

  if (offsetParent && getNodeName(offsetParent) === 'body' && getComputedStyle(offsetParent).position === 'static') {
    return window;
  }

  return offsetParent || getContainingBlock(element) || window;
}

var top = 'top';
var bottom = 'bottom';
var right = 'right';
var left = 'left';
var auto = 'auto';
var basePlacements = [top, bottom, right, left];
var start = 'start';
var end = 'end';
var clippingParents = 'clippingParents';
var viewport = 'viewport';
var popper = 'popper';
var reference = 'reference';
var variationPlacements = /*#__PURE__*/basePlacements.reduce(function (acc, placement) {
  return acc.concat([placement + "-" + start, placement + "-" + end]);
}, []);
var placements = /*#__PURE__*/[].concat(basePlacements, [auto]).reduce(function (acc, placement) {
  return acc.concat([placement, placement + "-" + start, placement + "-" + end]);
}, []); // modifiers that need to read the DOM

var beforeRead = 'beforeRead';
var read = 'read';
var afterRead = 'afterRead'; // pure-logic modifiers

var beforeMain = 'beforeMain';
var main = 'main';
var afterMain = 'afterMain'; // modifier with the purpose to write to the DOM (or write into a framework state)

var beforeWrite = 'beforeWrite';
var write = 'write';
var afterWrite = 'afterWrite';
var modifierPhases = [beforeRead, read, afterRead, beforeMain, main, afterMain, beforeWrite, write, afterWrite];

function order(modifiers) {
  var map = new Map();
  var visited = new Set();
  var result = [];
  modifiers.forEach(function (modifier) {
    map.set(modifier.name, modifier);
  }); // On visiting object, check for its dependencies and visit them recursively

  function sort(modifier) {
    visited.add(modifier.name);
    var requires = [].concat(modifier.requires || [], modifier.requiresIfExists || []);
    requires.forEach(function (dep) {
      if (!visited.has(dep)) {
        var depModifier = map.get(dep);

        if (depModifier) {
          sort(depModifier);
        }
      }
    });
    result.push(modifier);
  }

  modifiers.forEach(function (modifier) {
    if (!visited.has(modifier.name)) {
      // check for visited object
      sort(modifier);
    }
  });
  return result;
}

function orderModifiers(modifiers) {
  // order based on dependencies
  var orderedModifiers = order(modifiers); // order based on phase

  return modifierPhases.reduce(function (acc, phase) {
    return acc.concat(orderedModifiers.filter(function (modifier) {
      return modifier.phase === phase;
    }));
  }, []);
}

function debounce(fn) {
  var pending;
  return function () {
    if (!pending) {
      pending = new Promise(function (resolve) {
        Promise.resolve().then(function () {
          pending = undefined;
          resolve(fn());
        });
      });
    }

    return pending;
  };
}

function format(str) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return [].concat(args).reduce(function (p, c) {
    return p.replace(/%s/, c);
  }, str);
}

var INVALID_MODIFIER_ERROR = 'Popper: modifier "%s" provided an invalid %s property, expected %s but got %s';
var MISSING_DEPENDENCY_ERROR = 'Popper: modifier "%s" requires "%s", but "%s" modifier is not available';
var VALID_PROPERTIES = ['name', 'enabled', 'phase', 'fn', 'effect', 'requires', 'options'];
function validateModifiers(modifiers) {
  modifiers.forEach(function (modifier) {
    Object.keys(modifier).forEach(function (key) {
      switch (key) {
        case 'name':
          if (typeof modifier.name !== 'string') {
            console.error(format(INVALID_MODIFIER_ERROR, String(modifier.name), '"name"', '"string"', "\"" + String(modifier.name) + "\""));
          }

          break;

        case 'enabled':
          if (typeof modifier.enabled !== 'boolean') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"enabled"', '"boolean"', "\"" + String(modifier.enabled) + "\""));
          }

        case 'phase':
          if (modifierPhases.indexOf(modifier.phase) < 0) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"phase"', "either " + modifierPhases.join(', '), "\"" + String(modifier.phase) + "\""));
          }

          break;

        case 'fn':
          if (typeof modifier.fn !== 'function') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"fn"', '"function"', "\"" + String(modifier.fn) + "\""));
          }

          break;

        case 'effect':
          if (typeof modifier.effect !== 'function') {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"effect"', '"function"', "\"" + String(modifier.fn) + "\""));
          }

          break;

        case 'requires':
          if (!Array.isArray(modifier.requires)) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requires"', '"array"', "\"" + String(modifier.requires) + "\""));
          }

          break;

        case 'requiresIfExists':
          if (!Array.isArray(modifier.requiresIfExists)) {
            console.error(format(INVALID_MODIFIER_ERROR, modifier.name, '"requiresIfExists"', '"array"', "\"" + String(modifier.requiresIfExists) + "\""));
          }

          break;

        case 'options':
        case 'data':
          break;

        default:
          console.error("PopperJS: an invalid property has been provided to the \"" + modifier.name + "\" modifier, valid properties are " + VALID_PROPERTIES.map(function (s) {
            return "\"" + s + "\"";
          }).join(', ') + "; but \"" + key + "\" was provided.");
      }

      modifier.requires && modifier.requires.forEach(function (requirement) {
        if (modifiers.find(function (mod) {
          return mod.name === requirement;
        }) == null) {
          console.error(format(MISSING_DEPENDENCY_ERROR, String(modifier.name), requirement, requirement));
        }
      });
    });
  });
}

function uniqueBy(arr, fn) {
  var identifiers = new Set();
  return arr.filter(function (item) {
    var identifier = fn(item);

    if (!identifiers.has(identifier)) {
      identifiers.add(identifier);
      return true;
    }
  });
}

function getBasePlacement(placement) {
  return placement.split('-')[0];
}

function mergeByName(modifiers) {
  var merged = modifiers.reduce(function (merged, current) {
    var existing = merged[current.name];
    merged[current.name] = existing ? Object.assign(Object.assign(Object.assign({}, existing), current), {}, {
      options: Object.assign(Object.assign({}, existing.options), current.options),
      data: Object.assign(Object.assign({}, existing.data), current.data)
    }) : current;
    return merged;
  }, {}); // IE11 does not support Object.values

  return Object.keys(merged).map(function (key) {
    return merged[key];
  });
}

var INVALID_ELEMENT_ERROR = 'Popper: Invalid reference or popper argument provided. They must be either a DOM element or virtual element.';
var INFINITE_LOOP_ERROR = 'Popper: An infinite loop in the modifiers cycle has been detected! The cycle has been interrupted to prevent a browser crash.';
var DEFAULT_OPTIONS = {
  placement: 'bottom',
  modifiers: [],
  strategy: 'absolute'
};

function areValidElements() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return !args.some(function (element) {
    return !(element && typeof element.getBoundingClientRect === 'function');
  });
}

function popperGenerator(generatorOptions) {
  if (generatorOptions === void 0) {
    generatorOptions = {};
  }

  var _generatorOptions = generatorOptions,
      _generatorOptions$def = _generatorOptions.defaultModifiers,
      defaultModifiers = _generatorOptions$def === void 0 ? [] : _generatorOptions$def,
      _generatorOptions$def2 = _generatorOptions.defaultOptions,
      defaultOptions = _generatorOptions$def2 === void 0 ? DEFAULT_OPTIONS : _generatorOptions$def2;
  return function createPopper(reference, popper, options) {
    if (options === void 0) {
      options = defaultOptions;
    }

    var state = {
      placement: 'bottom',
      orderedModifiers: [],
      options: Object.assign(Object.assign({}, DEFAULT_OPTIONS), defaultOptions),
      modifiersData: {},
      elements: {
        reference: reference,
        popper: popper
      },
      attributes: {},
      styles: {}
    };
    var effectCleanupFns = [];
    var isDestroyed = false;
    var instance = {
      state: state,
      setOptions: function setOptions(options) {
        cleanupModifierEffects();
        state.options = Object.assign(Object.assign(Object.assign({}, defaultOptions), state.options), options);
        state.scrollParents = {
          reference: isElement(reference) ? listScrollParents(reference) : reference.contextElement ? listScrollParents(reference.contextElement) : [],
          popper: listScrollParents(popper)
        }; // Orders the modifiers based on their dependencies and `phase`
        // properties

        var orderedModifiers = orderModifiers(mergeByName([].concat(defaultModifiers, state.options.modifiers))); // Strip out disabled modifiers

        state.orderedModifiers = orderedModifiers.filter(function (m) {
          return m.enabled;
        }); // Validate the provided modifiers so that the consumer will get warned
        // if one of the modifiers is invalid for any reason

        if (process.env.NODE_ENV !== "production") {
          var modifiers = uniqueBy([].concat(orderedModifiers, state.options.modifiers), function (_ref) {
            var name = _ref.name;
            return name;
          });
          validateModifiers(modifiers);

          if (getBasePlacement(state.options.placement) === auto) {
            var flipModifier = state.orderedModifiers.find(function (_ref2) {
              var name = _ref2.name;
              return name === 'flip';
            });

            if (!flipModifier) {
              console.error(['Popper: "auto" placements require the "flip" modifier be', 'present and enabled to work.'].join(' '));
            }
          }

          var _getComputedStyle = getComputedStyle(popper),
              marginTop = _getComputedStyle.marginTop,
              marginRight = _getComputedStyle.marginRight,
              marginBottom = _getComputedStyle.marginBottom,
              marginLeft = _getComputedStyle.marginLeft; // We no longer take into account `margins` on the popper, and it can
          // cause bugs with positioning, so we'll warn the consumer


          if ([marginTop, marginRight, marginBottom, marginLeft].some(function (margin) {
            return parseFloat(margin);
          })) {
            console.warn(['Popper: CSS "margin" styles cannot be used to apply padding', 'between the popper and its reference element or boundary.', 'To replicate margin, use the `offset` modifier, as well as', 'the `padding` option in the `preventOverflow` and `flip`', 'modifiers.'].join(' '));
          }
        }

        runModifierEffects();
        return instance.update();
      },
      // Sync update – it will always be executed, even if not necessary. This
      // is useful for low frequency updates where sync behavior simplifies the
      // logic.
      // For high frequency updates (e.g. `resize` and `scroll` events), always
      // prefer the async Popper#update method
      forceUpdate: function forceUpdate() {
        if (isDestroyed) {
          return;
        }

        var _state$elements = state.elements,
            reference = _state$elements.reference,
            popper = _state$elements.popper; // Don't proceed if `reference` or `popper` are not valid elements
        // anymore

        if (!areValidElements(reference, popper)) {
          if (process.env.NODE_ENV !== "production") {
            console.error(INVALID_ELEMENT_ERROR);
          }

          return;
        } // Store the reference and popper rects to be read by modifiers


        state.rects = {
          reference: getCompositeRect(reference, getOffsetParent(popper), state.options.strategy === 'fixed'),
          popper: getLayoutRect(popper)
        }; // Modifiers have the ability to reset the current update cycle. The
        // most common use case for this is the `flip` modifier changing the
        // placement, which then needs to re-run all the modifiers, because the
        // logic was previously ran for the previous placement and is therefore
        // stale/incorrect

        state.reset = false;
        state.placement = state.options.placement; // On each update cycle, the `modifiersData` property for each modifier
        // is filled with the initial data specified by the modifier. This means
        // it doesn't persist and is fresh on each update.
        // To ensure persistent data, use `${name}#persistent`

        state.orderedModifiers.forEach(function (modifier) {
          return state.modifiersData[modifier.name] = Object.assign({}, modifier.data);
        });
        var __debug_loops__ = 0;

        for (var index = 0; index < state.orderedModifiers.length; index++) {
          if (process.env.NODE_ENV !== "production") {
            __debug_loops__ += 1;

            if (__debug_loops__ > 100) {
              console.error(INFINITE_LOOP_ERROR);
              break;
            }
          }

          if (state.reset === true) {
            state.reset = false;
            index = -1;
            continue;
          }

          var _state$orderedModifie = state.orderedModifiers[index],
              fn = _state$orderedModifie.fn,
              _state$orderedModifie2 = _state$orderedModifie.options,
              _options = _state$orderedModifie2 === void 0 ? {} : _state$orderedModifie2,
              name = _state$orderedModifie.name;

          if (typeof fn === 'function') {
            state = fn({
              state: state,
              options: _options,
              name: name,
              instance: instance
            }) || state;
          }
        }
      },
      // Async and optimistically optimized update – it will not be executed if
      // not necessary (debounced to run at most once-per-tick)
      update: debounce(function () {
        return new Promise(function (resolve) {
          instance.forceUpdate();
          resolve(state);
        });
      }),
      destroy: function destroy() {
        cleanupModifierEffects();
        isDestroyed = true;
      }
    };

    if (!areValidElements(reference, popper)) {
      if (process.env.NODE_ENV !== "production") {
        console.error(INVALID_ELEMENT_ERROR);
      }

      return instance;
    }

    instance.setOptions(options).then(function (state) {
      if (!isDestroyed && options.onFirstUpdate) {
        options.onFirstUpdate(state);
      }
    }); // Modifiers have the ability to execute arbitrary code before the first
    // update cycle runs. They will be executed in the same order as the update
    // cycle. This is useful when a modifier adds some persistent data that
    // other modifiers need to use, but the modifier is run after the dependent
    // one.

    function runModifierEffects() {
      state.orderedModifiers.forEach(function (_ref3) {
        var name = _ref3.name,
            _ref3$options = _ref3.options,
            options = _ref3$options === void 0 ? {} : _ref3$options,
            effect = _ref3.effect;

        if (typeof effect === 'function') {
          var cleanupFn = effect({
            state: state,
            name: name,
            instance: instance,
            options: options
          });

          var noopFn = function noopFn() {};

          effectCleanupFns.push(cleanupFn || noopFn);
        }
      });
    }

    function cleanupModifierEffects() {
      effectCleanupFns.forEach(function (fn) {
        return fn();
      });
      effectCleanupFns = [];
    }

    return instance;
  };
}

var passive = {
  passive: true
};

function effect(_ref) {
  var state = _ref.state,
      instance = _ref.instance,
      options = _ref.options;
  var _options$scroll = options.scroll,
      scroll = _options$scroll === void 0 ? true : _options$scroll,
      _options$resize = options.resize,
      resize = _options$resize === void 0 ? true : _options$resize;
  var window = getWindow(state.elements.popper);
  var scrollParents = [].concat(state.scrollParents.reference, state.scrollParents.popper);

  if (scroll) {
    scrollParents.forEach(function (scrollParent) {
      scrollParent.addEventListener('scroll', instance.update, passive);
    });
  }

  if (resize) {
    window.addEventListener('resize', instance.update, passive);
  }

  return function () {
    if (scroll) {
      scrollParents.forEach(function (scrollParent) {
        scrollParent.removeEventListener('scroll', instance.update, passive);
      });
    }

    if (resize) {
      window.removeEventListener('resize', instance.update, passive);
    }
  };
} // eslint-disable-next-line import/no-unused-modules


var eventListeners = {
  name: 'eventListeners',
  enabled: true,
  phase: 'write',
  fn: function fn() {},
  effect: effect,
  data: {}
};

function getVariation(placement) {
  return placement.split('-')[1];
}

function getMainAxisFromPlacement(placement) {
  return ['top', 'bottom'].indexOf(placement) >= 0 ? 'x' : 'y';
}

function computeOffsets(_ref) {
  var reference = _ref.reference,
      element = _ref.element,
      placement = _ref.placement;
  var basePlacement = placement ? getBasePlacement(placement) : null;
  var variation = placement ? getVariation(placement) : null;
  var commonX = reference.x + reference.width / 2 - element.width / 2;
  var commonY = reference.y + reference.height / 2 - element.height / 2;
  var offsets;

  switch (basePlacement) {
    case top:
      offsets = {
        x: commonX,
        y: reference.y - element.height
      };
      break;

    case bottom:
      offsets = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;

    case right:
      offsets = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;

    case left:
      offsets = {
        x: reference.x - element.width,
        y: commonY
      };
      break;

    default:
      offsets = {
        x: reference.x,
        y: reference.y
      };
  }

  var mainAxis = basePlacement ? getMainAxisFromPlacement(basePlacement) : null;

  if (mainAxis != null) {
    var len = mainAxis === 'y' ? 'height' : 'width';

    switch (variation) {
      case start:
        offsets[mainAxis] = Math.floor(offsets[mainAxis]) - Math.floor(reference[len] / 2 - element[len] / 2);
        break;

      case end:
        offsets[mainAxis] = Math.floor(offsets[mainAxis]) + Math.ceil(reference[len] / 2 - element[len] / 2);
        break;
    }
  }

  return offsets;
}

function popperOffsets(_ref) {
  var state = _ref.state,
      name = _ref.name;
  // Offsets are the actual position the popper needs to have to be
  // properly positioned near its reference element
  // This is the most basic placement, and will be adjusted by
  // the modifiers in the next step
  state.modifiersData[name] = computeOffsets({
    reference: state.rects.reference,
    element: state.rects.popper,
    strategy: 'absolute',
    placement: state.placement
  });
} // eslint-disable-next-line import/no-unused-modules


var popperOffsets$1 = {
  name: 'popperOffsets',
  enabled: true,
  phase: 'read',
  fn: popperOffsets,
  data: {}
};

var unsetSides = {
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto'
}; // Round the offsets to the nearest suitable subpixel based on the DPR.
// Zooming can change the DPR, but it seems to report a value that will
// cleanly divide the values into the appropriate subpixels.

function roundOffsets(_ref) {
  var x = _ref.x,
      y = _ref.y;
  var win = window;
  var dpr = win.devicePixelRatio || 1;
  return {
    x: Math.round(x * dpr) / dpr || 0,
    y: Math.round(y * dpr) / dpr || 0
  };
}

function mapToStyles(_ref2) {
  var _Object$assign2;

  var popper = _ref2.popper,
      popperRect = _ref2.popperRect,
      placement = _ref2.placement,
      offsets = _ref2.offsets,
      position = _ref2.position,
      gpuAcceleration = _ref2.gpuAcceleration,
      adaptive = _ref2.adaptive;

  var _roundOffsets = roundOffsets(offsets),
      x = _roundOffsets.x,
      y = _roundOffsets.y;

  var hasX = offsets.hasOwnProperty('x');
  var hasY = offsets.hasOwnProperty('y');
  var sideX = left;
  var sideY = top;
  var win = window;

  if (adaptive) {
    var offsetParent = getOffsetParent(popper);

    if (offsetParent === getWindow(popper)) {
      offsetParent = getDocumentElement(popper);
    } // $FlowFixMe: force type refinement, we compare offsetParent with window above, but Flow doesn't detect it

    /*:: offsetParent = (offsetParent: Element); */


    if (placement === top) {
      sideY = bottom;
      y -= offsetParent.clientHeight - popperRect.height;
      y *= gpuAcceleration ? 1 : -1;
    }

    if (placement === left) {
      sideX = right;
      x -= offsetParent.clientWidth - popperRect.width;
      x *= gpuAcceleration ? 1 : -1;
    }
  }

  var commonStyles = Object.assign({
    position: position
  }, adaptive && unsetSides);

  if (gpuAcceleration) {
    var _Object$assign;

    return Object.assign(Object.assign({}, commonStyles), {}, (_Object$assign = {}, _Object$assign[sideY] = hasY ? '0' : '', _Object$assign[sideX] = hasX ? '0' : '', _Object$assign.transform = (win.devicePixelRatio || 1) < 2 ? "translate(" + x + "px, " + y + "px)" : "translate3d(" + x + "px, " + y + "px, 0)", _Object$assign));
  }

  return Object.assign(Object.assign({}, commonStyles), {}, (_Object$assign2 = {}, _Object$assign2[sideY] = hasY ? y + "px" : '', _Object$assign2[sideX] = hasX ? x + "px" : '', _Object$assign2.transform = '', _Object$assign2));
}

function computeStyles(_ref3) {
  var state = _ref3.state,
      options = _ref3.options;
  var _options$gpuAccelerat = options.gpuAcceleration,
      gpuAcceleration = _options$gpuAccelerat === void 0 ? true : _options$gpuAccelerat,
      _options$adaptive = options.adaptive,
      adaptive = _options$adaptive === void 0 ? true : _options$adaptive;

  if (process.env.NODE_ENV !== "production") {
    var transitionProperty = getComputedStyle(state.elements.popper).transitionProperty || '';

    if (adaptive && ['transform', 'top', 'right', 'bottom', 'left'].some(function (property) {
      return transitionProperty.indexOf(property) >= 0;
    })) {
      console.warn(['Popper: Detected CSS transitions on at least one of the following', 'CSS properties: "transform", "top", "right", "bottom", "left".', '\n\n', 'Disable the "computeStyles" modifier\'s `adaptive` option to allow', 'for smooth transitions, or remove these properties from the CSS', 'transition declaration on the popper element if only transitioning', 'opacity or background-color for example.', '\n\n', 'We recommend using the popper element as a wrapper around an inner', 'element that can have any CSS property transitioned for animations.'].join(' '));
    }
  }

  var commonStyles = {
    placement: getBasePlacement(state.placement),
    popper: state.elements.popper,
    popperRect: state.rects.popper,
    gpuAcceleration: gpuAcceleration
  };

  if (state.modifiersData.popperOffsets != null) {
    state.styles.popper = Object.assign(Object.assign({}, state.styles.popper), mapToStyles(Object.assign(Object.assign({}, commonStyles), {}, {
      offsets: state.modifiersData.popperOffsets,
      position: state.options.strategy,
      adaptive: adaptive
    })));
  }

  if (state.modifiersData.arrow != null) {
    state.styles.arrow = Object.assign(Object.assign({}, state.styles.arrow), mapToStyles(Object.assign(Object.assign({}, commonStyles), {}, {
      offsets: state.modifiersData.arrow,
      position: 'absolute',
      adaptive: false
    })));
  }

  state.attributes.popper = Object.assign(Object.assign({}, state.attributes.popper), {}, {
    'data-popper-placement': state.placement
  });
} // eslint-disable-next-line import/no-unused-modules


var computeStyles$1 = {
  name: 'computeStyles',
  enabled: true,
  phase: 'beforeWrite',
  fn: computeStyles,
  data: {}
};

// and applies them to the HTMLElements such as popper and arrow

function applyStyles(_ref) {
  var state = _ref.state;
  Object.keys(state.elements).forEach(function (name) {
    var style = state.styles[name] || {};
    var attributes = state.attributes[name] || {};
    var element = state.elements[name]; // arrow is optional + virtual elements

    if (!isHTMLElement(element) || !getNodeName(element)) {
      return;
    } // Flow doesn't support to extend this property, but it's the most
    // effective way to apply styles to an HTMLElement
    // $FlowFixMe


    Object.assign(element.style, style);
    Object.keys(attributes).forEach(function (name) {
      var value = attributes[name];

      if (value === false) {
        element.removeAttribute(name);
      } else {
        element.setAttribute(name, value === true ? '' : value);
      }
    });
  });
}

function effect$1(_ref2) {
  var state = _ref2.state;
  var initialStyles = {
    popper: {
      position: state.options.strategy,
      left: '0',
      top: '0',
      margin: '0'
    },
    arrow: {
      position: 'absolute'
    },
    reference: {}
  };
  Object.assign(state.elements.popper.style, initialStyles.popper);

  if (state.elements.arrow) {
    Object.assign(state.elements.arrow.style, initialStyles.arrow);
  }

  return function () {
    Object.keys(state.elements).forEach(function (name) {
      var element = state.elements[name];
      var attributes = state.attributes[name] || {};
      var styleProperties = Object.keys(state.styles.hasOwnProperty(name) ? state.styles[name] : initialStyles[name]); // Set all values to an empty string to unset them

      var style = styleProperties.reduce(function (style, property) {
        style[property] = '';
        return style;
      }, {}); // arrow is optional + virtual elements

      if (!isHTMLElement(element) || !getNodeName(element)) {
        return;
      } // Flow doesn't support to extend this property, but it's the most
      // effective way to apply styles to an HTMLElement
      // $FlowFixMe


      Object.assign(element.style, style);
      Object.keys(attributes).forEach(function (attribute) {
        element.removeAttribute(attribute);
      });
    });
  };
} // eslint-disable-next-line import/no-unused-modules


var applyStyles$1 = {
  name: 'applyStyles',
  enabled: true,
  phase: 'write',
  fn: applyStyles,
  effect: effect$1,
  requires: ['computeStyles']
};

function distanceAndSkiddingToXY(placement, rects, offset) {
  var basePlacement = getBasePlacement(placement);
  var invertDistance = [left, top].indexOf(basePlacement) >= 0 ? -1 : 1;

  var _ref = typeof offset === 'function' ? offset(Object.assign(Object.assign({}, rects), {}, {
    placement: placement
  })) : offset,
      skidding = _ref[0],
      distance = _ref[1];

  skidding = skidding || 0;
  distance = (distance || 0) * invertDistance;
  return [left, right].indexOf(basePlacement) >= 0 ? {
    x: distance,
    y: skidding
  } : {
    x: skidding,
    y: distance
  };
}

function offset(_ref2) {
  var state = _ref2.state,
      options = _ref2.options,
      name = _ref2.name;
  var _options$offset = options.offset,
      offset = _options$offset === void 0 ? [0, 0] : _options$offset;
  var data = placements.reduce(function (acc, placement) {
    acc[placement] = distanceAndSkiddingToXY(placement, state.rects, offset);
    return acc;
  }, {});
  var _data$state$placement = data[state.placement],
      x = _data$state$placement.x,
      y = _data$state$placement.y;

  if (state.modifiersData.popperOffsets != null) {
    state.modifiersData.popperOffsets.x += x;
    state.modifiersData.popperOffsets.y += y;
  }

  state.modifiersData[name] = data;
} // eslint-disable-next-line import/no-unused-modules


var offset$1 = {
  name: 'offset',
  enabled: true,
  phase: 'main',
  requires: ['popperOffsets'],
  fn: offset
};

var hash = {
  left: 'right',
  right: 'left',
  bottom: 'top',
  top: 'bottom'
};
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

var hash$1 = {
  start: 'end',
  end: 'start'
};
function getOppositeVariationPlacement(placement) {
  return placement.replace(/start|end/g, function (matched) {
    return hash$1[matched];
  });
}

function getViewportRect(element) {
  var win = getWindow(element);
  var html = getDocumentElement(element);
  var visualViewport = win.visualViewport;
  var width = html.clientWidth;
  var height = html.clientHeight;
  var x = 0;
  var y = 0; // NB: This isn't supported on iOS <= 12. If the keyboard is open, the popper
  // can be obscured underneath it.
  // Also, `html.clientHeight` adds the bottom bar height in Safari iOS, even
  // if it isn't open, so if this isn't available, the popper will be detected
  // to overflow the bottom of the screen too early.

  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height; // Uses Layout Viewport (like Chrome; Safari does not currently)
    // In Chrome, it returns a value very close to 0 (+/-) but contains rounding
    // errors due to floating point numbers, so we need to check precision.
    // Safari returns a number <= 0, usually < -1 when pinch-zoomed
    // Feature detection fails in mobile emulation mode in Chrome.
    // Math.abs(win.innerWidth / visualViewport.scale - visualViewport.width) <
    // 0.001
    // Fallback here: "Not Safari" userAgent

    if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }

  return {
    width: width,
    height: height,
    x: x + getWindowScrollBarX(element),
    y: y
  };
}

// of the `<html>` and `<body>` rect bounds if horizontally scrollable

function getDocumentRect(element) {
  var html = getDocumentElement(element);
  var winScroll = getWindowScroll(element);
  var body = element.ownerDocument.body;
  var width = Math.max(html.scrollWidth, html.clientWidth, body ? body.scrollWidth : 0, body ? body.clientWidth : 0);
  var height = Math.max(html.scrollHeight, html.clientHeight, body ? body.scrollHeight : 0, body ? body.clientHeight : 0);
  var x = -winScroll.scrollLeft + getWindowScrollBarX(element);
  var y = -winScroll.scrollTop;

  if (getComputedStyle(body || html).direction === 'rtl') {
    x += Math.max(html.clientWidth, body ? body.clientWidth : 0) - width;
  }

  return {
    width: width,
    height: height,
    x: x,
    y: y
  };
}

function contains(parent, child) {
  // $FlowFixMe: hasOwnProperty doesn't seem to work in tests
  var isShadow = Boolean(child.getRootNode && child.getRootNode().host); // First, attempt with faster native method

  if (parent.contains(child)) {
    return true;
  } // then fallback to custom implementation with Shadow DOM support
  else if (isShadow) {
      var next = child;

      do {
        if (next && parent.isSameNode(next)) {
          return true;
        } // $FlowFixMe: need a better way to handle this...


        next = next.parentNode || next.host;
      } while (next);
    } // Give up, the result is false


  return false;
}

function rectToClientRect(rect) {
  return Object.assign(Object.assign({}, rect), {}, {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  });
}

function getInnerBoundingClientRect(element) {
  var rect = getBoundingClientRect(element);
  rect.top = rect.top + element.clientTop;
  rect.left = rect.left + element.clientLeft;
  rect.bottom = rect.top + element.clientHeight;
  rect.right = rect.left + element.clientWidth;
  rect.width = element.clientWidth;
  rect.height = element.clientHeight;
  rect.x = rect.left;
  rect.y = rect.top;
  return rect;
}

function getClientRectFromMixedType(element, clippingParent) {
  return clippingParent === viewport ? rectToClientRect(getViewportRect(element)) : isHTMLElement(clippingParent) ? getInnerBoundingClientRect(clippingParent) : rectToClientRect(getDocumentRect(getDocumentElement(element)));
} // A "clipping parent" is an overflowable container with the characteristic of
// clipping (or hiding) overflowing elements with a position different from
// `initial`


function getClippingParents(element) {
  var clippingParents = listScrollParents(element);
  var canEscapeClipping = ['absolute', 'fixed'].indexOf(getComputedStyle(element).position) >= 0;
  var clipperElement = canEscapeClipping && isHTMLElement(element) ? getOffsetParent(element) : element;

  if (!isElement(clipperElement)) {
    return [];
  } // $FlowFixMe: https://github.com/facebook/flow/issues/1414


  return clippingParents.filter(function (clippingParent) {
    return isElement(clippingParent) && contains(clippingParent, clipperElement);
  });
} // Gets the maximum area that the element is visible in due to any number of
// clipping parents


function getClippingRect(element, boundary, rootBoundary) {
  var mainClippingParents = boundary === 'clippingParents' ? getClippingParents(element) : [].concat(boundary);
  var clippingParents = [].concat(mainClippingParents, [rootBoundary]);
  var firstClippingParent = clippingParents[0];
  var clippingRect = clippingParents.reduce(function (accRect, clippingParent) {
    var rect = getClientRectFromMixedType(element, clippingParent);
    accRect.top = Math.max(rect.top, accRect.top);
    accRect.right = Math.min(rect.right, accRect.right);
    accRect.bottom = Math.min(rect.bottom, accRect.bottom);
    accRect.left = Math.max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromMixedType(element, firstClippingParent));
  clippingRect.width = clippingRect.right - clippingRect.left;
  clippingRect.height = clippingRect.bottom - clippingRect.top;
  clippingRect.x = clippingRect.left;
  clippingRect.y = clippingRect.top;
  return clippingRect;
}

function getFreshSideObject() {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
}

function mergePaddingObject(paddingObject) {
  return Object.assign(Object.assign({}, getFreshSideObject()), paddingObject);
}

function expandToHashMap(value, keys) {
  return keys.reduce(function (hashMap, key) {
    hashMap[key] = value;
    return hashMap;
  }, {});
}

function detectOverflow(state, options) {
  if (options === void 0) {
    options = {};
  }

  var _options = options,
      _options$placement = _options.placement,
      placement = _options$placement === void 0 ? state.placement : _options$placement,
      _options$boundary = _options.boundary,
      boundary = _options$boundary === void 0 ? clippingParents : _options$boundary,
      _options$rootBoundary = _options.rootBoundary,
      rootBoundary = _options$rootBoundary === void 0 ? viewport : _options$rootBoundary,
      _options$elementConte = _options.elementContext,
      elementContext = _options$elementConte === void 0 ? popper : _options$elementConte,
      _options$altBoundary = _options.altBoundary,
      altBoundary = _options$altBoundary === void 0 ? false : _options$altBoundary,
      _options$padding = _options.padding,
      padding = _options$padding === void 0 ? 0 : _options$padding;
  var paddingObject = mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements));
  var altContext = elementContext === popper ? reference : popper;
  var referenceElement = state.elements.reference;
  var popperRect = state.rects.popper;
  var element = state.elements[altBoundary ? altContext : elementContext];
  var clippingClientRect = getClippingRect(isElement(element) ? element : element.contextElement || getDocumentElement(state.elements.popper), boundary, rootBoundary);
  var referenceClientRect = getBoundingClientRect(referenceElement);
  var popperOffsets = computeOffsets({
    reference: referenceClientRect,
    element: popperRect,
    strategy: 'absolute',
    placement: placement
  });
  var popperClientRect = rectToClientRect(Object.assign(Object.assign({}, popperRect), popperOffsets));
  var elementClientRect = elementContext === popper ? popperClientRect : referenceClientRect; // positive = overflowing the clipping rect
  // 0 or negative = within the clipping rect

  var overflowOffsets = {
    top: clippingClientRect.top - elementClientRect.top + paddingObject.top,
    bottom: elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom,
    left: clippingClientRect.left - elementClientRect.left + paddingObject.left,
    right: elementClientRect.right - clippingClientRect.right + paddingObject.right
  };
  var offsetData = state.modifiersData.offset; // Offsets can be applied only to the popper element

  if (elementContext === popper && offsetData) {
    var offset = offsetData[placement];
    Object.keys(overflowOffsets).forEach(function (key) {
      var multiply = [right, bottom].indexOf(key) >= 0 ? 1 : -1;
      var axis = [top, bottom].indexOf(key) >= 0 ? 'y' : 'x';
      overflowOffsets[key] += offset[axis] * multiply;
    });
  }

  return overflowOffsets;
}

/*:: type OverflowsMap = { [ComputedPlacement]: number }; */

/*;; type OverflowsMap = { [key in ComputedPlacement]: number }; */
function computeAutoPlacement(state, options) {
  if (options === void 0) {
    options = {};
  }

  var _options = options,
      placement = _options.placement,
      boundary = _options.boundary,
      rootBoundary = _options.rootBoundary,
      padding = _options.padding,
      flipVariations = _options.flipVariations,
      _options$allowedAutoP = _options.allowedAutoPlacements,
      allowedAutoPlacements = _options$allowedAutoP === void 0 ? placements : _options$allowedAutoP;
  var variation = getVariation(placement);
  var placements$1 = (variation ? flipVariations ? variationPlacements : variationPlacements.filter(function (placement) {
    return getVariation(placement) === variation;
  }) : basePlacements).filter(function (placement) {
    return allowedAutoPlacements.indexOf(placement) >= 0;
  }); // $FlowFixMe: Flow seems to have problems with two array unions...

  var overflows = placements$1.reduce(function (acc, placement) {
    acc[placement] = detectOverflow(state, {
      placement: placement,
      boundary: boundary,
      rootBoundary: rootBoundary,
      padding: padding
    })[getBasePlacement(placement)];
    return acc;
  }, {});
  return Object.keys(overflows).sort(function (a, b) {
    return overflows[a] - overflows[b];
  });
}

function getExpandedFallbackPlacements(placement) {
  if (getBasePlacement(placement) === auto) {
    return [];
  }

  var oppositePlacement = getOppositePlacement(placement);
  return [getOppositeVariationPlacement(placement), oppositePlacement, getOppositeVariationPlacement(oppositePlacement)];
}

function flip(_ref) {
  var state = _ref.state,
      options = _ref.options,
      name = _ref.name;

  if (state.modifiersData[name]._skip) {
    return;
  }

  var _options$mainAxis = options.mainAxis,
      checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
      _options$altAxis = options.altAxis,
      checkAltAxis = _options$altAxis === void 0 ? true : _options$altAxis,
      specifiedFallbackPlacements = options.fallbackPlacements,
      padding = options.padding,
      boundary = options.boundary,
      rootBoundary = options.rootBoundary,
      altBoundary = options.altBoundary,
      _options$flipVariatio = options.flipVariations,
      flipVariations = _options$flipVariatio === void 0 ? true : _options$flipVariatio,
      allowedAutoPlacements = options.allowedAutoPlacements;
  var preferredPlacement = state.options.placement;
  var basePlacement = getBasePlacement(preferredPlacement);
  var isBasePlacement = basePlacement === preferredPlacement;
  var fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipVariations ? [getOppositePlacement(preferredPlacement)] : getExpandedFallbackPlacements(preferredPlacement));
  var placements = [preferredPlacement].concat(fallbackPlacements).reduce(function (acc, placement) {
    return acc.concat(getBasePlacement(placement) === auto ? computeAutoPlacement(state, {
      placement: placement,
      boundary: boundary,
      rootBoundary: rootBoundary,
      padding: padding,
      flipVariations: flipVariations,
      allowedAutoPlacements: allowedAutoPlacements
    }) : placement);
  }, []);
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var checksMap = new Map();
  var makeFallbackChecks = true;
  var firstFittingPlacement = placements[0];

  for (var i = 0; i < placements.length; i++) {
    var placement = placements[i];

    var _basePlacement = getBasePlacement(placement);

    var isStartVariation = getVariation(placement) === start;
    var isVertical = [top, bottom].indexOf(_basePlacement) >= 0;
    var len = isVertical ? 'width' : 'height';
    var overflow = detectOverflow(state, {
      placement: placement,
      boundary: boundary,
      rootBoundary: rootBoundary,
      altBoundary: altBoundary,
      padding: padding
    });
    var mainVariationSide = isVertical ? isStartVariation ? right : left : isStartVariation ? bottom : top;

    if (referenceRect[len] > popperRect[len]) {
      mainVariationSide = getOppositePlacement(mainVariationSide);
    }

    var altVariationSide = getOppositePlacement(mainVariationSide);
    var checks = [];

    if (checkMainAxis) {
      checks.push(overflow[_basePlacement] <= 0);
    }

    if (checkAltAxis) {
      checks.push(overflow[mainVariationSide] <= 0, overflow[altVariationSide] <= 0);
    }

    if (checks.every(function (check) {
      return check;
    })) {
      firstFittingPlacement = placement;
      makeFallbackChecks = false;
      break;
    }

    checksMap.set(placement, checks);
  }

  if (makeFallbackChecks) {
    // `2` may be desired in some cases – research later
    var numberOfChecks = flipVariations ? 3 : 1;

    var _loop = function _loop(_i) {
      var fittingPlacement = placements.find(function (placement) {
        var checks = checksMap.get(placement);

        if (checks) {
          return checks.slice(0, _i).every(function (check) {
            return check;
          });
        }
      });

      if (fittingPlacement) {
        firstFittingPlacement = fittingPlacement;
        return "break";
      }
    };

    for (var _i = numberOfChecks; _i > 0; _i--) {
      var _ret = _loop(_i);

      if (_ret === "break") break;
    }
  }

  if (state.placement !== firstFittingPlacement) {
    state.modifiersData[name]._skip = true;
    state.placement = firstFittingPlacement;
    state.reset = true;
  }
} // eslint-disable-next-line import/no-unused-modules


var flip$1 = {
  name: 'flip',
  enabled: true,
  phase: 'main',
  fn: flip,
  requiresIfExists: ['offset'],
  data: {
    _skip: false
  }
};

function getAltAxis(axis) {
  return axis === 'x' ? 'y' : 'x';
}

function within(min, value, max) {
  return Math.max(min, Math.min(value, max));
}

function preventOverflow(_ref) {
  var state = _ref.state,
      options = _ref.options,
      name = _ref.name;
  var _options$mainAxis = options.mainAxis,
      checkMainAxis = _options$mainAxis === void 0 ? true : _options$mainAxis,
      _options$altAxis = options.altAxis,
      checkAltAxis = _options$altAxis === void 0 ? false : _options$altAxis,
      boundary = options.boundary,
      rootBoundary = options.rootBoundary,
      altBoundary = options.altBoundary,
      padding = options.padding,
      _options$tether = options.tether,
      tether = _options$tether === void 0 ? true : _options$tether,
      _options$tetherOffset = options.tetherOffset,
      tetherOffset = _options$tetherOffset === void 0 ? 0 : _options$tetherOffset;
  var overflow = detectOverflow(state, {
    boundary: boundary,
    rootBoundary: rootBoundary,
    padding: padding,
    altBoundary: altBoundary
  });
  var basePlacement = getBasePlacement(state.placement);
  var variation = getVariation(state.placement);
  var isBasePlacement = !variation;
  var mainAxis = getMainAxisFromPlacement(basePlacement);
  var altAxis = getAltAxis(mainAxis);
  var popperOffsets = state.modifiersData.popperOffsets;
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var tetherOffsetValue = typeof tetherOffset === 'function' ? tetherOffset(Object.assign(Object.assign({}, state.rects), {}, {
    placement: state.placement
  })) : tetherOffset;
  var data = {
    x: 0,
    y: 0
  };

  if (!popperOffsets) {
    return;
  }

  if (checkMainAxis) {
    var mainSide = mainAxis === 'y' ? top : left;
    var altSide = mainAxis === 'y' ? bottom : right;
    var len = mainAxis === 'y' ? 'height' : 'width';
    var offset = popperOffsets[mainAxis];
    var min = popperOffsets[mainAxis] + overflow[mainSide];
    var max = popperOffsets[mainAxis] - overflow[altSide];
    var additive = tether ? -popperRect[len] / 2 : 0;
    var minLen = variation === start ? referenceRect[len] : popperRect[len];
    var maxLen = variation === start ? -popperRect[len] : -referenceRect[len]; // We need to include the arrow in the calculation so the arrow doesn't go
    // outside the reference bounds

    var arrowElement = state.elements.arrow;
    var arrowRect = tether && arrowElement ? getLayoutRect(arrowElement) : {
      width: 0,
      height: 0
    };
    var arrowPaddingObject = state.modifiersData['arrow#persistent'] ? state.modifiersData['arrow#persistent'].padding : getFreshSideObject();
    var arrowPaddingMin = arrowPaddingObject[mainSide];
    var arrowPaddingMax = arrowPaddingObject[altSide]; // If the reference length is smaller than the arrow length, we don't want
    // to include its full size in the calculation. If the reference is small
    // and near the edge of a boundary, the popper can overflow even if the
    // reference is not overflowing as well (e.g. virtual elements with no
    // width or height)

    var arrowLen = within(0, referenceRect[len], arrowRect[len]);
    var minOffset = isBasePlacement ? referenceRect[len] / 2 - additive - arrowLen - arrowPaddingMin - tetherOffsetValue : minLen - arrowLen - arrowPaddingMin - tetherOffsetValue;
    var maxOffset = isBasePlacement ? -referenceRect[len] / 2 + additive + arrowLen + arrowPaddingMax + tetherOffsetValue : maxLen + arrowLen + arrowPaddingMax + tetherOffsetValue;
    var arrowOffsetParent = state.elements.arrow && getOffsetParent(state.elements.arrow);
    var clientOffset = arrowOffsetParent ? mainAxis === 'y' ? arrowOffsetParent.clientTop || 0 : arrowOffsetParent.clientLeft || 0 : 0;
    var offsetModifierValue = state.modifiersData.offset ? state.modifiersData.offset[state.placement][mainAxis] : 0;
    var tetherMin = popperOffsets[mainAxis] + minOffset - offsetModifierValue - clientOffset;
    var tetherMax = popperOffsets[mainAxis] + maxOffset - offsetModifierValue;
    var preventedOffset = within(tether ? Math.min(min, tetherMin) : min, offset, tether ? Math.max(max, tetherMax) : max);
    popperOffsets[mainAxis] = preventedOffset;
    data[mainAxis] = preventedOffset - offset;
  }

  if (checkAltAxis) {
    var _mainSide = mainAxis === 'x' ? top : left;

    var _altSide = mainAxis === 'x' ? bottom : right;

    var _offset = popperOffsets[altAxis];

    var _min = _offset + overflow[_mainSide];

    var _max = _offset - overflow[_altSide];

    var _preventedOffset = within(_min, _offset, _max);

    popperOffsets[altAxis] = _preventedOffset;
    data[altAxis] = _preventedOffset - _offset;
  }

  state.modifiersData[name] = data;
} // eslint-disable-next-line import/no-unused-modules


var preventOverflow$1 = {
  name: 'preventOverflow',
  enabled: true,
  phase: 'main',
  fn: preventOverflow,
  requiresIfExists: ['offset']
};

function arrow(_ref) {
  var _state$modifiersData$;

  var state = _ref.state,
      name = _ref.name;
  var arrowElement = state.elements.arrow;
  var popperOffsets = state.modifiersData.popperOffsets;
  var basePlacement = getBasePlacement(state.placement);
  var axis = getMainAxisFromPlacement(basePlacement);
  var isVertical = [left, right].indexOf(basePlacement) >= 0;
  var len = isVertical ? 'height' : 'width';

  if (!arrowElement || !popperOffsets) {
    return;
  }

  var paddingObject = state.modifiersData[name + "#persistent"].padding;
  var arrowRect = getLayoutRect(arrowElement);
  var minProp = axis === 'y' ? top : left;
  var maxProp = axis === 'y' ? bottom : right;
  var endDiff = state.rects.reference[len] + state.rects.reference[axis] - popperOffsets[axis] - state.rects.popper[len];
  var startDiff = popperOffsets[axis] - state.rects.reference[axis];
  var arrowOffsetParent = getOffsetParent(arrowElement);
  var clientSize = arrowOffsetParent ? axis === 'y' ? arrowOffsetParent.clientHeight || 0 : arrowOffsetParent.clientWidth || 0 : 0;
  var centerToReference = endDiff / 2 - startDiff / 2; // Make sure the arrow doesn't overflow the popper if the center point is
  // outside of the popper bounds

  var min = paddingObject[minProp];
  var max = clientSize - arrowRect[len] - paddingObject[maxProp];
  var center = clientSize / 2 - arrowRect[len] / 2 + centerToReference;
  var offset = within(min, center, max); // Prevents breaking syntax highlighting...

  var axisProp = axis;
  state.modifiersData[name] = (_state$modifiersData$ = {}, _state$modifiersData$[axisProp] = offset, _state$modifiersData$.centerOffset = offset - center, _state$modifiersData$);
}

function effect$2(_ref2) {
  var state = _ref2.state,
      options = _ref2.options,
      name = _ref2.name;
  var _options$element = options.element,
      arrowElement = _options$element === void 0 ? '[data-popper-arrow]' : _options$element,
      _options$padding = options.padding,
      padding = _options$padding === void 0 ? 0 : _options$padding;

  if (arrowElement == null) {
    return;
  } // CSS selector


  if (typeof arrowElement === 'string') {
    arrowElement = state.elements.popper.querySelector(arrowElement);

    if (!arrowElement) {
      return;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    if (!isHTMLElement(arrowElement)) {
      console.error(['Popper: "arrow" element must be an HTMLElement (not an SVGElement).', 'To use an SVG arrow, wrap it in an HTMLElement that will be used as', 'the arrow.'].join(' '));
    }
  }

  if (!contains(state.elements.popper, arrowElement)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(['Popper: "arrow" modifier\'s `element` must be a child of the popper', 'element.'].join(' '));
    }

    return;
  }

  state.elements.arrow = arrowElement;
  state.modifiersData[name + "#persistent"] = {
    padding: mergePaddingObject(typeof padding !== 'number' ? padding : expandToHashMap(padding, basePlacements))
  };
} // eslint-disable-next-line import/no-unused-modules


var arrow$1 = {
  name: 'arrow',
  enabled: true,
  phase: 'main',
  fn: arrow,
  effect: effect$2,
  requires: ['popperOffsets'],
  requiresIfExists: ['preventOverflow']
};

function getSideOffsets(overflow, rect, preventedOffsets) {
  if (preventedOffsets === void 0) {
    preventedOffsets = {
      x: 0,
      y: 0
    };
  }

  return {
    top: overflow.top - rect.height - preventedOffsets.y,
    right: overflow.right - rect.width + preventedOffsets.x,
    bottom: overflow.bottom - rect.height + preventedOffsets.y,
    left: overflow.left - rect.width - preventedOffsets.x
  };
}

function isAnySideFullyClipped(overflow) {
  return [top, right, bottom, left].some(function (side) {
    return overflow[side] >= 0;
  });
}

function hide(_ref) {
  var state = _ref.state,
      name = _ref.name;
  var referenceRect = state.rects.reference;
  var popperRect = state.rects.popper;
  var preventedOffsets = state.modifiersData.preventOverflow;
  var referenceOverflow = detectOverflow(state, {
    elementContext: 'reference'
  });
  var popperAltOverflow = detectOverflow(state, {
    altBoundary: true
  });
  var referenceClippingOffsets = getSideOffsets(referenceOverflow, referenceRect);
  var popperEscapeOffsets = getSideOffsets(popperAltOverflow, popperRect, preventedOffsets);
  var isReferenceHidden = isAnySideFullyClipped(referenceClippingOffsets);
  var hasPopperEscaped = isAnySideFullyClipped(popperEscapeOffsets);
  state.modifiersData[name] = {
    referenceClippingOffsets: referenceClippingOffsets,
    popperEscapeOffsets: popperEscapeOffsets,
    isReferenceHidden: isReferenceHidden,
    hasPopperEscaped: hasPopperEscaped
  };
  state.attributes.popper = Object.assign(Object.assign({}, state.attributes.popper), {}, {
    'data-popper-reference-hidden': isReferenceHidden,
    'data-popper-escaped': hasPopperEscaped
  });
} // eslint-disable-next-line import/no-unused-modules


var hide$1 = {
  name: 'hide',
  enabled: true,
  phase: 'main',
  requiresIfExists: ['preventOverflow'],
  fn: hide
};

var defaultModifiers = [eventListeners, popperOffsets$1, computeStyles$1, applyStyles$1, offset$1, flip$1, preventOverflow$1, arrow$1, hide$1];
var createPopper = /*#__PURE__*/popperGenerator({
  defaultModifiers: defaultModifiers
}); // eslint-disable-next-line import/no-unused-modules

/* node_modules/svelte-icons/fa/FaSearch.svelte generated by Svelte v3.23.2 */

function create_default_slot$2(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

function create_fragment$6(ctx) {
	let iconbase;
	let current;
	const iconbase_spread_levels = [{ viewBox: "0 0 512 512" }, /*$$props*/ ctx[0]];

	let iconbase_props = {
		$$slots: { default: [create_default_slot$2] },
		$$scope: { ctx }
	};

	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
	}

	iconbase = new IconBase({ props: iconbase_props });

	return {
		c() {
			create_component(iconbase.$$.fragment);
		},
		m(target, anchor) {
			mount_component(iconbase, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const iconbase_changes = (dirty & /*$$props*/ 1)
			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
			: {};

			if (dirty & /*$$scope*/ 2) {
				iconbase_changes.$$scope = { dirty, ctx };
			}

			iconbase.$set(iconbase_changes);
		},
		i(local) {
			if (current) return;
			transition_in(iconbase.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(iconbase.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(iconbase, detaching);
		}
	};
}

function instance$5($$self, $$props, $$invalidate) {
	$$self.$set = $$new_props => {
		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
	};

	$$props = exclude_internal_props($$props);
	return [$$props];
}

class FaSearch extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$5, create_fragment$6, safe_not_equal, {});
	}
}

/* node_modules/svelte-icons/fa/FaWindowClose.svelte generated by Svelte v3.23.2 */

function create_default_slot$3(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M464 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h416c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zm-83.6 290.5c4.8 4.8 4.8 12.6 0 17.4l-40.5 40.5c-4.8 4.8-12.6 4.8-17.4 0L256 313.3l-66.5 67.1c-4.8 4.8-12.6 4.8-17.4 0l-40.5-40.5c-4.8-4.8-4.8-12.6 0-17.4l67.1-66.5-67.1-66.5c-4.8-4.8-4.8-12.6 0-17.4l40.5-40.5c4.8-4.8 12.6-4.8 17.4 0l66.5 67.1 66.5-67.1c4.8-4.8 12.6-4.8 17.4 0l40.5 40.5c4.8 4.8 4.8 12.6 0 17.4L313.3 256l67.1 66.5z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

function create_fragment$7(ctx) {
	let iconbase;
	let current;
	const iconbase_spread_levels = [{ viewBox: "0 0 512 512" }, /*$$props*/ ctx[0]];

	let iconbase_props = {
		$$slots: { default: [create_default_slot$3] },
		$$scope: { ctx }
	};

	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
	}

	iconbase = new IconBase({ props: iconbase_props });

	return {
		c() {
			create_component(iconbase.$$.fragment);
		},
		m(target, anchor) {
			mount_component(iconbase, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const iconbase_changes = (dirty & /*$$props*/ 1)
			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
			: {};

			if (dirty & /*$$scope*/ 2) {
				iconbase_changes.$$scope = { dirty, ctx };
			}

			iconbase.$set(iconbase_changes);
		},
		i(local) {
			if (current) return;
			transition_in(iconbase.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(iconbase.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(iconbase, detaching);
		}
	};
}

function instance$6($$self, $$props, $$invalidate) {
	$$self.$set = $$new_props => {
		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
	};

	$$props = exclude_internal_props($$props);
	return [$$props];
}

class FaWindowClose extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$6, create_fragment$7, safe_not_equal, {});
	}
}

/* src/JoAutoComplete.svelte generated by Svelte v3.23.2 */
const get_item_slot_changes = dirty => ({ item: dirty & /*items*/ 4 });
const get_item_slot_context = ctx => ({ item: /*item*/ ctx[23] });

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	return child_ctx;
}

const get_selected_slot_changes = dirty => ({ selected: dirty & /*selected*/ 256 });
const get_selected_slot_context = ctx => ({ selected: /*selected*/ ctx[8] });

// (112:4) {:else}
function create_else_block(ctx) {
	let div;
	let current;
	const selected_slot_template = /*$$slots*/ ctx[14].selected;
	const selected_slot = create_slot(selected_slot_template, ctx, /*$$scope*/ ctx[13], get_selected_slot_context);

	return {
		c() {
			div = element("div");
			if (selected_slot) selected_slot.c();
			attr(div, "class", "flex-grow bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (selected_slot) {
				selected_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (selected_slot) {
				if (selected_slot.p && dirty & /*$$scope, selected*/ 8448) {
					update_slot(selected_slot, selected_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_selected_slot_changes, get_selected_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(selected_slot, local);
			current = true;
		},
		o(local) {
			transition_out(selected_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (selected_slot) selected_slot.d(detaching);
		}
	};
}

// (103:4) {#if !selected}
function create_if_block_3$1(ctx) {
	let input;
	let mounted;
	let dispose;

	return {
		c() {
			input = element("input");
			attr(input, "type", "text");
			input.value = keyword;
			attr(input, "placeholder", /*placeholder*/ ctx[1]);
			attr(input, "class", "bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded flex-grow");
		},
		m(target, anchor) {
			insert(target, input, anchor);

			if (!mounted) {
				dispose = [
					listen(input, "input", /*input_handler*/ ctx[15]),
					listen(input, "focusin", /*onFocusIn*/ ctx[10])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*placeholder*/ 2) {
				attr(input, "placeholder", /*placeholder*/ ctx[1]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (126:38) 
function create_if_block_2$1(ctx) {
	let button;
	let fawindowclose;
	let current;
	let mounted;
	let dispose;
	fawindowclose = new FaWindowClose({});

	return {
		c() {
			button = element("button");
			create_component(fawindowclose.$$.fragment);
			attr(button, "type", "button");
			attr(button, "class", "appearance-none ml-2 w-8 rounded p-2 bg-gray-300 text-center");
		},
		m(target, anchor) {
			insert(target, button, anchor);
			mount_component(fawindowclose, button, null);
			current = true;

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler*/ ctx[16]);
				mounted = true;
			}
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(fawindowclose.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(fawindowclose.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			destroy_component(fawindowclose);
			mounted = false;
			dispose();
		}
	};
}

// (122:36) 
function create_if_block_1$1(ctx) {
	let div;
	let fasearch;
	let current;
	fasearch = new FaSearch({});

	return {
		c() {
			div = element("div");
			create_component(fasearch.$$.fragment);
			attr(div, "class", "ml-2 w-8 rounded p-2 bg-gray-300 flex items-center");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(fasearch, div, null);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(fasearch.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(fasearch.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(fasearch);
		}
	};
}

// (118:4) {#if resultState == 'searching'}
function create_if_block$2(ctx) {
	let div;
	let faspinner;
	let current;
	faspinner = new FaSpinner({});

	return {
		c() {
			div = element("div");
			create_component(faspinner.$$.fragment);
			attr(div, "class", "ml-2 w-8 rounded p-2 bg-gray-300 flex items-center spinner text-blue-600");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(faspinner, div, null);
			current = true;
		},
		p: noop,
		i(local) {
			if (current) return;
			transition_in(faspinner.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(faspinner.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(faspinner);
		}
	};
}

// (144:4) {#each items as item (item.id)}
function create_each_block(key_1, ctx) {
	let li;
	let t;
	let current;
	let mounted;
	let dispose;
	const item_slot_template = /*$$slots*/ ctx[14].item;
	const item_slot = create_slot(item_slot_template, ctx, /*$$scope*/ ctx[13], get_item_slot_context);

	return {
		key: key_1,
		first: null,
		c() {
			li = element("li");
			if (item_slot) item_slot.c();
			t = space();
			attr(li, "class", "px-3 py-2 border-b border-gray-300 text-gray-700 hover:bg-gray-200");
			this.first = li;
		},
		m(target, anchor) {
			insert(target, li, anchor);

			if (item_slot) {
				item_slot.m(li, null);
			}

			append(li, t);
			current = true;

			if (!mounted) {
				dispose = listen(li, "click", function () {
					if (is_function(/*onSelect*/ ctx[11](/*item*/ ctx[23]))) /*onSelect*/ ctx[11](/*item*/ ctx[23]).apply(this, arguments);
				});

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (item_slot) {
				if (item_slot.p && dirty & /*$$scope, items*/ 8196) {
					update_slot(item_slot, item_slot_template, ctx, /*$$scope*/ ctx[13], dirty, get_item_slot_changes, get_item_slot_context);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(item_slot, local);
			current = true;
		},
		o(local) {
			transition_out(item_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(li);
			if (item_slot) item_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$8(ctx) {
	let div1;
	let div0;
	let current_block_type_index;
	let if_block0;
	let t0;
	let current_block_type_index_1;
	let if_block1;
	let t1;
	let ul;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	const if_block_creators = [create_if_block_3$1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (!/*selected*/ ctx[8]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	const if_block_creators_1 = [create_if_block$2, create_if_block_1$1, create_if_block_2$1];
	const if_blocks_1 = [];

	function select_block_type_1(ctx, dirty) {
		if (/*resultState*/ ctx[6] == "searching") return 0;
		if (/*resultState*/ ctx[6] == "idle") return 1;
		if (/*resultState*/ ctx[6] == "filled") return 2;
		return -1;
	}

	if (~(current_block_type_index_1 = select_block_type_1(ctx))) {
		if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
	}

	let each_value = /*items*/ ctx[2];
	const get_key = ctx => /*item*/ ctx[23].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			if_block0.c();
			t0 = space();
			if (if_block1) if_block1.c();
			t1 = space();
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "class", "input-wrapper");
			attr(ul, "style", /*popperStyles*/ ctx[7]);
			attr(ul, "class", "popper bg-white shadow-lg");
			attr(div1, "class", "jo-auto-complete w-full");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			if_blocks[current_block_type_index].m(div0, null);
			append(div0, t0);

			if (~current_block_type_index_1) {
				if_blocks_1[current_block_type_index_1].m(div0, null);
			}

			/*div0_binding*/ ctx[17](div0);
			append(div1, t1);
			append(div1, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			/*ul_binding*/ ctx[18](ul);
			/*div1_binding*/ ctx[19](div1);
			current = true;
		},
		p(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block0 = if_blocks[current_block_type_index];

				if (!if_block0) {
					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block0.c();
				}

				transition_in(if_block0, 1);
				if_block0.m(div0, t0);
			}

			let previous_block_index_1 = current_block_type_index_1;
			current_block_type_index_1 = select_block_type_1(ctx);

			if (current_block_type_index_1 === previous_block_index_1) {
				if (~current_block_type_index_1) {
					if_blocks_1[current_block_type_index_1].p(ctx, dirty);
				}
			} else {
				if (if_block1) {
					group_outros();

					transition_out(if_blocks_1[previous_block_index_1], 1, 1, () => {
						if_blocks_1[previous_block_index_1] = null;
					});

					check_outros();
				}

				if (~current_block_type_index_1) {
					if_block1 = if_blocks_1[current_block_type_index_1];

					if (!if_block1) {
						if_block1 = if_blocks_1[current_block_type_index_1] = if_block_creators_1[current_block_type_index_1](ctx);
						if_block1.c();
					}

					transition_in(if_block1, 1);
					if_block1.m(div0, null);
				} else {
					if_block1 = null;
				}
			}

			if (dirty & /*onSelect, items, $$scope*/ 10244) {
				const each_value = /*items*/ ctx[2];
				group_outros();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, outro_and_destroy_block, create_each_block, null, get_each_context);
				check_outros();
			}

			if (!current || dirty & /*popperStyles*/ 128) {
				attr(ul, "style", /*popperStyles*/ ctx[7]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			if_blocks[current_block_type_index].d();

			if (~current_block_type_index_1) {
				if_blocks_1[current_block_type_index_1].d();
			}

			/*div0_binding*/ ctx[17](null);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}

			/*ul_binding*/ ctx[18](null);
			/*div1_binding*/ ctx[19](null);
		}
	};
}

let keyword = "";

// One of:
// idle
// searching
// filled
function calcResultState({ value, searching }) {
	if (value != null && value != undefined) {
		return "filled";
	}

	if (searching) {
		return "searching";
	}

	return "idle";
}

function instance$7($$self, $$props, $$invalidate) {
	let { onSearch } = $$props;
	let { placeholder } = $$props;
	let { value } = $$props;
	let { items = [] } = $$props;
	let searchInput;
	let popperElement;
	let wrapper;
	let popperWidth = 0;
	let searching = false;

	function onKeywordChange(keyword) {
		$$invalidate(21, searching = true);

		onSearch(keyword).catch(err => {
			console.log(err);
		}).then(() => {
			$$invalidate(21, searching = false);
		});
	}

	function onFocusIn(event) {
		$$invalidate(4, popperElement.style.display = "block", popperElement);
	}

	function onClickOutside(event) {
		if (wrapper.contains(event.target)) {
			return;
		} else {
			$$invalidate(4, popperElement.style.display = "none", popperElement);
		}
	}

	function onSelect(item) {
		$$invalidate(0, value = item.id);
	}

	onMount(() => {
		if (!searchInput) {
			return;
		}

		$$invalidate(20, popperWidth = searchInput.offsetWidth);

		createPopper(searchInput, popperElement, {
			placement: "bottom-start",
			strategy: "absolute",
			modifiers: [
				{
					name: "offset",
					options: { offset: [2, 12] }
				}
			]
		});

		window.addEventListener("click", onClickOutside);

		// Initial value provided
		if (value) {
			onKeywordChange("");
		}
	});

	onDestroy(() => {
		window.removeEventListener("click", onClickOutside);
	});

	let { $$slots = {}, $$scope } = $$props;
	const input_handler = ev => onKeywordChange(ev.target.value);

	const click_handler = () => {
		$$invalidate(0, value = null);
	};

	function div0_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			searchInput = $$value;
			$$invalidate(3, searchInput);
		});
	}

	function ul_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			popperElement = $$value;
			$$invalidate(4, popperElement);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			wrapper = $$value;
			$$invalidate(5, wrapper);
		});
	}

	$$self.$set = $$props => {
		if ("onSearch" in $$props) $$invalidate(12, onSearch = $$props.onSearch);
		if ("placeholder" in $$props) $$invalidate(1, placeholder = $$props.placeholder);
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
		if ("items" in $$props) $$invalidate(2, items = $$props.items);
		if ("$$scope" in $$props) $$invalidate(13, $$scope = $$props.$$scope);
	};

	let resultState;
	let popperStyles;
	let selected;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*value, searching*/ 2097153) {
			 $$invalidate(6, resultState = calcResultState({ value, searching }));
		}

		if ($$self.$$.dirty & /*popperWidth*/ 1048576) {
			 $$invalidate(7, popperStyles = `width: ${popperWidth}px; display: none; z-index: 25;`);
		}

		if ($$self.$$.dirty & /*items, value*/ 5) {
			 $$invalidate(8, selected = items.find(item => item.id == value));
		}
	};

	return [
		value,
		placeholder,
		items,
		searchInput,
		popperElement,
		wrapper,
		resultState,
		popperStyles,
		selected,
		onKeywordChange,
		onFocusIn,
		onSelect,
		onSearch,
		$$scope,
		$$slots,
		input_handler,
		click_handler,
		div0_binding,
		ul_binding,
		div1_binding
	];
}

class JoAutoComplete extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$7, create_fragment$8, safe_not_equal, {
			onSearch: 12,
			placeholder: 1,
			value: 0,
			items: 2
		});
	}
}

/* src/JoButton.svelte generated by Svelte v3.23.2 */

function create_if_block$3(ctx) {
	let t;

	return {
		c() {
			t = text(/*label*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*label*/ 1) set_data(t, /*label*/ ctx[0]);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (24:8)      
function fallback_block(ctx) {
	let if_block_anchor;
	let if_block = /*label*/ ctx[0] && create_if_block$3(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*label*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$3(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$9(ctx) {
	let button;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*$$slots*/ ctx[8].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], null);
	const default_slot_or_fallback = default_slot || fallback_block(ctx);

	return {
		c() {
			button = element("button");
			if (default_slot_or_fallback) default_slot_or_fallback.c();
			attr(button, "type", "button");
			button.disabled = /*disabled*/ ctx[2];
			attr(button, "class", /*classes*/ ctx[3]);
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (default_slot_or_fallback) {
				default_slot_or_fallback.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(button, "click", function () {
					if (is_function(/*action*/ ctx[1])) /*action*/ ctx[1].apply(this, arguments);
				});

				mounted = true;
			}
		},
		p(new_ctx, [dirty]) {
			ctx = new_ctx;

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 128) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[7], dirty, null, null);
				}
			} else {
				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*label*/ 1) {
					default_slot_or_fallback.p(ctx, dirty);
				}
			}

			if (!current || dirty & /*disabled*/ 4) {
				button.disabled = /*disabled*/ ctx[2];
			}

			if (!current || dirty & /*classes*/ 8) {
				attr(button, "class", /*classes*/ ctx[3]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(button);
			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

const baseClasses = "px-4 py-1 rounded disabled:opacity-50";

function instance$8($$self, $$props, $$invalidate) {
	let { label = null } = $$props;
	let { action = null } = $$props;
	let { disabled = false } = $$props;
	let { color = null } = $$props;
	let { dark = false } = $$props;
	let { cls = "" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("label" in $$props) $$invalidate(0, label = $$props.label);
		if ("action" in $$props) $$invalidate(1, action = $$props.action);
		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
		if ("color" in $$props) $$invalidate(4, color = $$props.color);
		if ("dark" in $$props) $$invalidate(5, dark = $$props.dark);
		if ("cls" in $$props) $$invalidate(6, cls = $$props.cls);
		if ("$$scope" in $$props) $$invalidate(7, $$scope = $$props.$$scope);
	};

	let colors;
	let classes;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*dark, color*/ 48) {
			 $$invalidate(9, colors = dark
			? color
				? `bg-${color}-700 text-white`
				: "bg-gray-900 text-white"
			: "bg-white border border-gray-400");
		}

		if ($$self.$$.dirty & /*colors, cls*/ 576) {
			 $$invalidate(3, classes = `${baseClasses} ${colors} ${cls}`);
		}
	};

	return [label, action, disabled, classes, color, dark, cls, $$scope, $$slots];
}

class JoButton extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$8, create_fragment$9, safe_not_equal, {
			label: 0,
			action: 1,
			disabled: 2,
			color: 4,
			dark: 5,
			cls: 6
		});
	}
}

/* node_modules/svelte-icons/md/MdClose.svelte generated by Svelte v3.23.2 */

function create_default_slot$4(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

function create_fragment$a(ctx) {
	let iconbase;
	let current;
	const iconbase_spread_levels = [{ viewBox: "0 0 24 24" }, /*$$props*/ ctx[0]];

	let iconbase_props = {
		$$slots: { default: [create_default_slot$4] },
		$$scope: { ctx }
	};

	for (let i = 0; i < iconbase_spread_levels.length; i += 1) {
		iconbase_props = assign(iconbase_props, iconbase_spread_levels[i]);
	}

	iconbase = new IconBase({ props: iconbase_props });

	return {
		c() {
			create_component(iconbase.$$.fragment);
		},
		m(target, anchor) {
			mount_component(iconbase, target, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			const iconbase_changes = (dirty & /*$$props*/ 1)
			? get_spread_update(iconbase_spread_levels, [iconbase_spread_levels[0], get_spread_object(/*$$props*/ ctx[0])])
			: {};

			if (dirty & /*$$scope*/ 2) {
				iconbase_changes.$$scope = { dirty, ctx };
			}

			iconbase.$set(iconbase_changes);
		},
		i(local) {
			if (current) return;
			transition_in(iconbase.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(iconbase.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(iconbase, detaching);
		}
	};
}

function instance$9($$self, $$props, $$invalidate) {
	$$self.$set = $$new_props => {
		$$invalidate(0, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
	};

	$$props = exclude_internal_props($$props);
	return [$$props];
}

class MdClose extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$9, create_fragment$a, safe_not_equal, {});
	}
}

/* src/JoDialog.svelte generated by Svelte v3.23.2 */

function add_css$1() {
	var style = element("style");
	style.id = "svelte-gvcuez-style";
	style.textContent = ".jo-dialog.svelte-gvcuez.svelte-gvcuez{display:none}.jo-dialog.show.svelte-gvcuez.svelte-gvcuez{display:block}.jo-dialog.svelte-gvcuez .layer.svelte-gvcuez{position:fixed;top:0;bottom:0;left:0;right:0;background:rgba(255, 255, 255, 0.2);display:flex;flex-direction:column;justify-content:center;align-items:center}";
	append(document.head, style);
}

// (41:8) <JoButton           cls="px-1 py-1"           action={() => {             show = !show           }}         >
function create_default_slot$5(ctx) {
	let div;
	let mdclose;
	let current;
	mdclose = new MdClose({});

	return {
		c() {
			div = element("div");
			create_component(mdclose.$$.fragment);
			attr(div, "class", "h-4 w-4");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(mdclose, div, null);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(mdclose.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(mdclose.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(mdclose);
		}
	};
}

function create_fragment$b(ctx) {
	let div5;
	let div4;
	let div3;
	let div1;
	let div0;
	let t0;
	let t1;
	let jobutton;
	let t2;
	let div2;
	let div3_style_value;
	let current;

	jobutton = new JoButton({
			props: {
				cls: "px-1 py-1",
				action: /*func*/ ctx[4],
				$$slots: { default: [create_default_slot$5] },
				$$scope: { ctx }
			}
		});

	const default_slot_template = /*$$slots*/ ctx[3].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);

	return {
		c() {
			div5 = element("div");
			div4 = element("div");
			div3 = element("div");
			div1 = element("div");
			div0 = element("div");
			t0 = text(/*title*/ ctx[2]);
			t1 = space();
			create_component(jobutton.$$.fragment);
			t2 = space();
			div2 = element("div");
			if (default_slot) default_slot.c();
			attr(div0, "class", "font-semibold");
			attr(div1, "class", "py-4 px-6 bg-gray-200 flex justify-between items-center border-b border-gray-400");
			attr(div2, "class", "px-6 py-4 bg-white");
			attr(div3, "class", "dialog shadow-xl");
			attr(div3, "style", div3_style_value = `width: ${/*width*/ ctx[1]}px;`);
			attr(div4, "class", "layer svelte-gvcuez");
			attr(div5, "class", "jo-dialog svelte-gvcuez");
			toggle_class(div5, "show", /*show*/ ctx[0]);
		},
		m(target, anchor) {
			insert(target, div5, anchor);
			append(div5, div4);
			append(div4, div3);
			append(div3, div1);
			append(div1, div0);
			append(div0, t0);
			append(div1, t1);
			mount_component(jobutton, div1, null);
			append(div3, t2);
			append(div3, div2);

			if (default_slot) {
				default_slot.m(div2, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (!current || dirty & /*title*/ 4) set_data(t0, /*title*/ ctx[2]);
			const jobutton_changes = {};
			if (dirty & /*show*/ 1) jobutton_changes.action = /*func*/ ctx[4];

			if (dirty & /*$$scope*/ 32) {
				jobutton_changes.$$scope = { dirty, ctx };
			}

			jobutton.$set(jobutton_changes);

			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 32) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[5], dirty, null, null);
				}
			}

			if (!current || dirty & /*width*/ 2 && div3_style_value !== (div3_style_value = `width: ${/*width*/ ctx[1]}px;`)) {
				attr(div3, "style", div3_style_value);
			}

			if (dirty & /*show*/ 1) {
				toggle_class(div5, "show", /*show*/ ctx[0]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(jobutton.$$.fragment, local);
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(jobutton.$$.fragment, local);
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div5);
			destroy_component(jobutton);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { show = false } = $$props;
	let { width = 500 } = $$props;
	let { title = "" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	const func = () => {
		$$invalidate(0, show = !show);
	};

	$$self.$set = $$props => {
		if ("show" in $$props) $$invalidate(0, show = $$props.show);
		if ("width" in $$props) $$invalidate(1, width = $$props.width);
		if ("title" in $$props) $$invalidate(2, title = $$props.title);
		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
	};

	return [show, width, title, $$slots, func, $$scope];
}

class JoDialog extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-gvcuez-style")) add_css$1();
		init(this, options, instance$a, create_fragment$b, safe_not_equal, { show: 0, width: 1, title: 2 });
	}
}

/* src/JoInput.svelte generated by Svelte v3.23.2 */

function create_fragment$c(ctx) {
	let input;
	let mounted;
	let dispose;

	return {
		c() {
			input = element("input");
			attr(input, "type", "text");
			attr(input, "placeholder", /*placeholder*/ ctx[1]);
			attr(input, "class", "bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded");
		},
		m(target, anchor) {
			insert(target, input, anchor);
			set_input_value(input, /*value*/ ctx[0]);

			if (!mounted) {
				dispose = listen(input, "input", /*input_input_handler*/ ctx[4]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*placeholder*/ 2) {
				attr(input, "placeholder", /*placeholder*/ ctx[1]);
			}

			if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
				set_input_value(input, /*value*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			dispose();
		}
	};
}

function instance$b($$self, $$props, $$invalidate) {
	let { value } = $$props;
	let { placeholder = "" } = $$props;
	let { min = null } = $$props;
	let { max = null } = $$props;

	function input_input_handler() {
		value = this.value;
		$$invalidate(0, value);
	}

	$$self.$set = $$props => {
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
		if ("placeholder" in $$props) $$invalidate(1, placeholder = $$props.placeholder);
		if ("min" in $$props) $$invalidate(2, min = $$props.min);
		if ("max" in $$props) $$invalidate(3, max = $$props.max);
	};

	return [value, placeholder, min, max, input_input_handler];
}

class JoInput extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$b, create_fragment$c, safe_not_equal, { value: 0, placeholder: 1, min: 2, max: 3 });
	}
}

/* src/JoLink.svelte generated by Svelte v3.23.2 */

function fallback_block$1(ctx) {
	let t;

	return {
		c() {
			t = text(/*label*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*label*/ 2) set_data(t, /*label*/ ctx[1]);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$d(ctx) {
	let a;
	let current;
	const default_slot_template = /*$$slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);
	const default_slot_or_fallback = default_slot || fallback_block$1(ctx);

	return {
		c() {
			a = element("a");
			if (default_slot_or_fallback) default_slot_or_fallback.c();
			attr(a, "href", /*to*/ ctx[0]);
			attr(a, "class", /*classes*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, a, anchor);

			if (default_slot_or_fallback) {
				default_slot_or_fallback.m(a, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && dirty & /*$$scope*/ 16) {
					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[4], dirty, null, null);
				}
			} else {
				if (default_slot_or_fallback && default_slot_or_fallback.p && dirty & /*label*/ 2) {
					default_slot_or_fallback.p(ctx, dirty);
				}
			}

			if (!current || dirty & /*to*/ 1) {
				attr(a, "href", /*to*/ ctx[0]);
			}

			if (!current || dirty & /*classes*/ 4) {
				attr(a, "class", /*classes*/ ctx[2]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot_or_fallback, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot_or_fallback, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(a);
			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
		}
	};
}

const baseClasses$1 = "px-3 py-1 rounded bg-white border rounded border-gray-400 hover:bg-gray-200 inline-block";

function instance$c($$self, $$props, $$invalidate) {
	let { to } = $$props;
	let { label = "" } = $$props;
	let { cls = "" } = $$props;
	let { $$slots = {}, $$scope } = $$props;

	$$self.$set = $$props => {
		if ("to" in $$props) $$invalidate(0, to = $$props.to);
		if ("label" in $$props) $$invalidate(1, label = $$props.label);
		if ("cls" in $$props) $$invalidate(3, cls = $$props.cls);
		if ("$$scope" in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	let classes;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*cls*/ 8) {
			 $$invalidate(2, classes = `${baseClasses$1} ${cls}`);
		}
	};

	return [to, label, classes, cls, $$scope, $$slots];
}

class JoLink extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$c, create_fragment$d, safe_not_equal, { to: 0, label: 1, cls: 3 });
	}
}

/* src/JoNotification.svelte generated by Svelte v3.23.2 */

function add_css$2() {
	var style = element("style");
	style.id = "svelte-pmn6eu-style";
	style.textContent = ".jo-notification.svelte-pmn6eu{bottom:8px;left:8px}";
	append(document.head, style);
}

function create_fragment$e(ctx) {
	let div;
	let t_value = /*$notification*/ ctx[1].message + "";
	let t;
	let div_class_value;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", div_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-pmn6eu"));
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, [dirty]) {
			if (dirty & /*$notification*/ 2 && t_value !== (t_value = /*$notification*/ ctx[1].message + "")) set_data(t, t_value);

			if (dirty & /*classes*/ 4 && div_class_value !== (div_class_value = "" + (null_to_empty(/*classes*/ ctx[2]) + " svelte-pmn6eu"))) {
				attr(div, "class", div_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance$d($$self, $$props, $$invalidate) {
	let $notification,
		$$unsubscribe_notification = noop,
		$$subscribe_notification = () => ($$unsubscribe_notification(), $$unsubscribe_notification = subscribe(notification, $$value => $$invalidate(1, $notification = $$value)), notification);

	$$self.$$.on_destroy.push(() => $$unsubscribe_notification());
	let { notification } = $$props;
	$$subscribe_notification();
	

	$$self.$set = $$props => {
		if ("notification" in $$props) $$subscribe_notification($$invalidate(0, notification = $$props.notification));
	};

	let hidden;
	let classes;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*$notification*/ 2) {
			 {
				switch ($notification.type) {
									}
			}
		}

		if ($$self.$$.dirty & /*$notification*/ 2) {
			 $$invalidate(4, hidden = $notification.value ? "flex" : "hidden");
		}

		if ($$self.$$.dirty & /*hidden*/ 16) {
			 $$invalidate(2, classes = `jo-notification h-16 w-full md:w-1/3 md:rounded md:shadow-xl fixed text-white items-center justify-start p-4 bg-gray-800 text-white text-lg ${hidden}`);
		}
	};

	return [notification, $notification, classes];
}

class JoNotification extends SvelteComponent {
	constructor(options) {
		super();
		if (!document.getElementById("svelte-pmn6eu-style")) add_css$2();
		init(this, options, instance$d, create_fragment$e, safe_not_equal, { notification: 0 });
	}
}

/* src/JoNumber.svelte generated by Svelte v3.23.2 */

function create_fragment$f(ctx) {
	let input;
	let input_min_value;
	let input_max_value;
	let mounted;
	let dispose;

	return {
		c() {
			input = element("input");
			attr(input, "type", "number");
			attr(input, "min", input_min_value = /*min*/ ctx[2] ? /*min*/ ctx[2] : undefined);
			attr(input, "max", input_max_value = /*max*/ ctx[3] ? /*max*/ ctx[3] : undefined);
			attr(input, "step", /*step*/ ctx[4]);
			attr(input, "placeholder", /*placeholder*/ ctx[1]);
			attr(input, "class", "bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded");
		},
		m(target, anchor) {
			insert(target, input, anchor);
			set_input_value(input, /*value*/ ctx[0]);

			if (!mounted) {
				dispose = listen(input, "input", /*input_input_handler*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*min*/ 4 && input_min_value !== (input_min_value = /*min*/ ctx[2] ? /*min*/ ctx[2] : undefined)) {
				attr(input, "min", input_min_value);
			}

			if (dirty & /*max*/ 8 && input_max_value !== (input_max_value = /*max*/ ctx[3] ? /*max*/ ctx[3] : undefined)) {
				attr(input, "max", input_max_value);
			}

			if (dirty & /*step*/ 16) {
				attr(input, "step", /*step*/ ctx[4]);
			}

			if (dirty & /*placeholder*/ 2) {
				attr(input, "placeholder", /*placeholder*/ ctx[1]);
			}

			if (dirty & /*value*/ 1 && to_number(input.value) !== /*value*/ ctx[0]) {
				set_input_value(input, /*value*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(input);
			mounted = false;
			dispose();
		}
	};
}

function instance$e($$self, $$props, $$invalidate) {
	let { value } = $$props;
	let { placeholder = "" } = $$props;
	let { min = null } = $$props;
	let { max = null } = $$props;
	let { step = 1 } = $$props;

	function input_input_handler() {
		value = to_number(this.value);
		$$invalidate(0, value);
	}

	$$self.$set = $$props => {
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
		if ("placeholder" in $$props) $$invalidate(1, placeholder = $$props.placeholder);
		if ("min" in $$props) $$invalidate(2, min = $$props.min);
		if ("max" in $$props) $$invalidate(3, max = $$props.max);
		if ("step" in $$props) $$invalidate(4, step = $$props.step);
	};

	return [value, placeholder, min, max, step, input_input_handler];
}

class JoNumber extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$e, create_fragment$f, safe_not_equal, {
			value: 0,
			placeholder: 1,
			min: 2,
			max: 3,
			step: 4
		});
	}
}

/* src/JoRadioGroup.svelte generated by Svelte v3.23.2 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

// (10:2) {#each options as option}
function create_each_block$1(ctx) {
	let div;
	let input;
	let input_value_value;
	let t0;
	let label;
	let t1_value = /*option*/ ctx[6].label + "";
	let t1;
	let t2;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			input = element("input");
			t0 = space();
			label = element("label");
			t1 = text(t1_value);
			t2 = space();
			attr(input, "type", "radio");
			input.__value = input_value_value = /*option*/ ctx[6].value;
			input.value = input.__value;
			attr(input, "class", "jo-radio appearance-none rounded-full border-2 border-gray-600 p-2 mr-2");
			/*$$binding_groups*/ ctx[5][0].push(input);
			attr(div, "class", "flex items-center text-gray-800 mb-1");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, input);
			input.checked = input.__value === /*group*/ ctx[0];
			append(div, t0);
			append(div, label);
			append(label, t1);
			append(div, t2);

			if (!mounted) {
				dispose = listen(input, "change", /*input_change_handler*/ ctx[4]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty & /*options*/ 2 && input_value_value !== (input_value_value = /*option*/ ctx[6].value)) {
				input.__value = input_value_value;
			}

			input.value = input.__value;

			if (dirty & /*group*/ 1) {
				input.checked = input.__value === /*group*/ ctx[0];
			}

			if (dirty & /*options*/ 2 && t1_value !== (t1_value = /*option*/ ctx[6].label + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(div);
			/*$$binding_groups*/ ctx[5][0].splice(/*$$binding_groups*/ ctx[5][0].indexOf(input), 1);
			mounted = false;
			dispose();
		}
	};
}

function create_fragment$g(ctx) {
	let div;
	let each_value = /*options*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", /*classes*/ ctx[2]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(div, null);
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*options, group*/ 3) {
				each_value = /*options*/ ctx[1];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*classes*/ 4) {
				attr(div, "class", /*classes*/ ctx[2]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$f($$self, $$props, $$invalidate) {
	let { options } = $$props;
	let { group } = $$props;
	let { cls } = $$props;
	const $$binding_groups = [[]];

	function input_change_handler() {
		group = this.__value;
		$$invalidate(0, group);
	}

	$$self.$set = $$props => {
		if ("options" in $$props) $$invalidate(1, options = $$props.options);
		if ("group" in $$props) $$invalidate(0, group = $$props.group);
		if ("cls" in $$props) $$invalidate(3, cls = $$props.cls);
	};

	let classes;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*cls*/ 8) {
			 $$invalidate(2, classes = `flex flex-col text-sm ${cls}`);
		}
	};

	return [group, options, classes, cls, input_change_handler, $$binding_groups];
}

class JoRadioGroup extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$f, create_fragment$g, safe_not_equal, { options: 1, group: 0, cls: 3 });
	}
}

/* src/JoSelect.svelte generated by Svelte v3.23.2 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i];
	return child_ctx;
}

// (18:4) {#each fullOptions as option (option.value)}
function create_each_block$2(key_1, ctx) {
	let option;
	let t_value = /*option*/ ctx[6].label + "";
	let t;
	let option_value_value;

	return {
		key: key_1,
		first: null,
		c() {
			option = element("option");
			t = text(t_value);
			option.__value = option_value_value = /*option*/ ctx[6].value;
			option.value = option.__value;
			this.first = option;
		},
		m(target, anchor) {
			insert(target, option, anchor);
			append(option, t);
		},
		p(ctx, dirty) {
			if (dirty & /*fullOptions*/ 4 && t_value !== (t_value = /*option*/ ctx[6].label + "")) set_data(t, t_value);

			if (dirty & /*fullOptions*/ 4 && option_value_value !== (option_value_value = /*option*/ ctx[6].value)) {
				option.__value = option_value_value;
			}

			option.value = option.__value;
		},
		d(detaching) {
			if (detaching) detach(option);
		}
	};
}

function create_fragment$h(ctx) {
	let div1;
	let select;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let select_class_value;
	let t;
	let div0;
	let mounted;
	let dispose;
	let each_value = /*fullOptions*/ ctx[2];
	const get_key = ctx => /*option*/ ctx[6].value;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$2(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
	}

	return {
		c() {
			div1 = element("div");
			select = element("select");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			div0 = element("div");
			div0.innerHTML = `<svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"></path></svg>`;
			attr(select, "class", select_class_value = `block appearance-none w-full px-4 py-1 pr-8 rounded focus:outline-none bg-white border border-gray-400 text-${/*size*/ ctx[1]}`);
			if (/*value*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[5].call(select));
			attr(div0, "class", "pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700");
			attr(div1, "class", "inline-block relative mr-2");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, select);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(select, null);
			}

			select_option(select, /*value*/ ctx[0]);
			append(div1, t);
			append(div1, div0);

			if (!mounted) {
				dispose = listen(select, "change", /*select_change_handler*/ ctx[5]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (dirty & /*fullOptions*/ 4) {
				const each_value = /*fullOptions*/ ctx[2];
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, select, destroy_block, create_each_block$2, null, get_each_context$2);
			}

			if (dirty & /*size*/ 2 && select_class_value !== (select_class_value = `block appearance-none w-full px-4 py-1 pr-8 rounded focus:outline-none bg-white border border-gray-400 text-${/*size*/ ctx[1]}`)) {
				attr(select, "class", select_class_value);
			}

			if (dirty & /*value, fullOptions*/ 5) {
				select_option(select, /*value*/ ctx[0]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}

			mounted = false;
			dispose();
		}
	};
}

function instance$g($$self, $$props, $$invalidate) {
	let { options } = $$props;
	let { value } = $$props;
	let { size = "sm" } = $$props;
	let { emptyLabel = "pilih data" } = $$props;

	function select_change_handler() {
		value = select_value(this);
		$$invalidate(0, value);
		(($$invalidate(2, fullOptions), $$invalidate(4, emptyLabel)), $$invalidate(3, options));
	}

	$$self.$set = $$props => {
		if ("options" in $$props) $$invalidate(3, options = $$props.options);
		if ("value" in $$props) $$invalidate(0, value = $$props.value);
		if ("size" in $$props) $$invalidate(1, size = $$props.size);
		if ("emptyLabel" in $$props) $$invalidate(4, emptyLabel = $$props.emptyLabel);
	};

	let fullOptions;

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*emptyLabel, options*/ 24) {
			 $$invalidate(2, fullOptions = [{ label: emptyLabel, value: null }, ...options]);
		}
	};

	return [value, size, fullOptions, options, emptyLabel, select_change_handler];
}

class JoSelect extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$g, create_fragment$h, safe_not_equal, {
			options: 3,
			value: 0,
			size: 1,
			emptyLabel: 4
		});
	}
}

/* src/JoWarn.svelte generated by Svelte v3.23.2 */

function create_if_block$4(ctx) {
	let div7;
	let div6;
	let div2;
	let div0;
	let mdwarning;
	let t0;
	let div1;
	let t2;
	let div5;
	let div3;
	let t3_value = /*$warning*/ ctx[1].message + "";
	let t3;
	let t4;
	let div4;
	let jobutton0;
	let t5;
	let jobutton1;
	let current;
	mdwarning = new MdWarning({});

	jobutton0 = new JoButton({
			props: {
				action: /*on_next*/ ctx[2],
				dark: true,
				color: "red",
				cls: "mr-2",
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			}
		});

	jobutton1 = new JoButton({
			props: {
				action: /*func*/ ctx[3],
				$$slots: { default: [create_default_slot$6] },
				$$scope: { ctx }
			}
		});

	return {
		c() {
			div7 = element("div");
			div6 = element("div");
			div2 = element("div");
			div0 = element("div");
			create_component(mdwarning.$$.fragment);
			t0 = space();
			div1 = element("div");
			div1.textContent = "Peringatan!";
			t2 = space();
			div5 = element("div");
			div3 = element("div");
			t3 = text(t3_value);
			t4 = space();
			div4 = element("div");
			create_component(jobutton0.$$.fragment);
			t5 = space();
			create_component(jobutton1.$$.fragment);
			attr(div0, "class", "h-8 w-8 text-red-700 mr-2");
			attr(div1, "class", "font-semibold text-lg");
			attr(div2, "class", "flex items-center border-b border-gray-400 px-6 py-2 bg-gray-300");
			attr(div3, "class", "font-medium");
			attr(div4, "class", "py-4");
			attr(div5, "class", "px-4 py-2");
			attr(div6, "class", "w-1/3 shadow-xl rounded bg-white");
			attr(div7, "class", "fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center");
			set_style(div7, "background", "rgba(250, 250, 250, 0.2)");
		},
		m(target, anchor) {
			insert(target, div7, anchor);
			append(div7, div6);
			append(div6, div2);
			append(div2, div0);
			mount_component(mdwarning, div0, null);
			append(div2, t0);
			append(div2, div1);
			append(div6, t2);
			append(div6, div5);
			append(div5, div3);
			append(div3, t3);
			append(div5, t4);
			append(div5, div4);
			mount_component(jobutton0, div4, null);
			append(div4, t5);
			mount_component(jobutton1, div4, null);
			current = true;
		},
		p(ctx, dirty) {
			if ((!current || dirty & /*$warning*/ 2) && t3_value !== (t3_value = /*$warning*/ ctx[1].message + "")) set_data(t3, t3_value);
			const jobutton0_changes = {};

			if (dirty & /*$$scope*/ 16) {
				jobutton0_changes.$$scope = { dirty, ctx };
			}

			jobutton0.$set(jobutton0_changes);
			const jobutton1_changes = {};
			if (dirty & /*warning*/ 1) jobutton1_changes.action = /*func*/ ctx[3];

			if (dirty & /*$$scope*/ 16) {
				jobutton1_changes.$$scope = { dirty, ctx };
			}

			jobutton1.$set(jobutton1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(mdwarning.$$.fragment, local);
			transition_in(jobutton0.$$.fragment, local);
			transition_in(jobutton1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(mdwarning.$$.fragment, local);
			transition_out(jobutton0.$$.fragment, local);
			transition_out(jobutton1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div7);
			destroy_component(mdwarning);
			destroy_component(jobutton0);
			destroy_component(jobutton1);
		}
	};
}

// (30:8) <JoButton           action={on_next}           dark={true}           color="red"           cls="mr-2"         >
function create_default_slot_1(ctx) {
	let t;

	return {
		c() {
			t = text("lanjutkan");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (38:8) <JoButton           action={() => warning.hide()}         >
function create_default_slot$6(ctx) {
	let t;

	return {
		c() {
			t = text("batal");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment$i(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*$warning*/ ctx[1].value && create_if_block$4(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$warning*/ ctx[1].value) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$warning*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$4(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$h($$self, $$props, $$invalidate) {
	let $warning,
		$$unsubscribe_warning = noop,
		$$subscribe_warning = () => ($$unsubscribe_warning(), $$unsubscribe_warning = subscribe(warning, $$value => $$invalidate(1, $warning = $$value)), warning);

	$$self.$$.on_destroy.push(() => $$unsubscribe_warning());
	let { warning } = $$props;
	$$subscribe_warning();

	async function on_next() {
		if ($warning.on_next) {
			await $warning.on_next();
		}

		warning.hide();
	}

	const func = () => warning.hide();

	$$self.$set = $$props => {
		if ("warning" in $$props) $$subscribe_warning($$invalidate(0, warning = $$props.warning));
	};

	return [warning, $warning, on_next, func];
}

class JoWarn extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$h, create_fragment$i, safe_not_equal, { warning: 0 });
	}
}

export { JoAsyncContent, JoAutoComplete, JoButton, JoDialog, JoErrorPane, JoInput, JoLink, JoNotification, JoNumber, JoRadioGroup, JoSelect, JoSpinner, JoWarn };
