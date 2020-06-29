<script type="text/javascript">
  import { onMount, onDestroy } from 'svelte';
  import { createPopper } from '@popperjs/core';
  import FaSearch from 'svelte-icons/fa/FaSearch.svelte';
  import FaSpinner from 'svelte-icons/fa/FaSpinner.svelte'
  import FaWindowClose from 'svelte-icons/fa/FaWindowClose.svelte'

  export let onSearch;
  export let placeholder;
  export let value;
  export let items = [];

  let keyword = '';
  let show = false;
  let searchInput;
  let popperElement;
  let wrapper;
  let popperWidth = 0;
  let searching = false;

  // One of:
  // idle
  // searching
  // filled
  function calcResultState ({ value, searching }) {
    if (value != null && value != undefined) {
      return 'filled';
    }
    if (searching) {
      return 'searching';
    }
    return 'idle';
  }
  $: resultState = calcResultState({ value, searching });

  $: popperStyles = `width: ${popperWidth}px; display: none; z-index: 25;`;

  $: selected = items.find(item => item.id == value);

  function onKeywordChange (keyword) {
    searching = true;
    onSearch(keyword)
      .catch(err => {
        console.log(err);
      })
      .then(() => {
        searching = false;
      });
  }

  function onFocusIn (event) {
    popperElement.style.display = 'block';
  }

  function onClickOutside (event) {
    if (wrapper.contains(event.target)) {
        return
    } else {
        popperElement.style.display = 'none';
    }
  }

  function onSelect (item) {
    value = item.id
  }

  onMount(() => {
    if (!searchInput) {
      return;
    }
    popperWidth = searchInput.offsetWidth;
    createPopper(searchInput, popperElement, {
      placement: 'bottom-start',
      strategy: 'absolute',
      modifiers: [
        {
          name: 'offset',
          options: {
            offset: [2, 12]
          }
        }
      ]
    });
    window.addEventListener('click', onClickOutside);

    // Initial value provided
    if (value) {
      onKeywordChange('');
    }
  });

  onDestroy (() => {
    window.removeEventListener('click', onClickOutside);
  });
</script>

<div 
  class="jo-auto-complete w-full"
  bind:this={wrapper}
>
  <div class="input-wrapper" bind:this={searchInput}>

    {#if !selected}
      <input 
        type="text" 
        value={keyword}
        on:input={ev => onKeywordChange(ev.target.value)}
        on:focusin={onFocusIn}
        placeholder={placeholder}
        class="bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded flex-grow" 
      />
    {:else}
      <div class="flex-grow bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded">
        <slot name="selected" {selected}></slot>
      </div>
    {/if}

    {#if resultState == 'searching'}
      <div class="ml-2 w-8 rounded p-2 bg-gray-300 flex items-center spinner text-blue-600">
        <FaSpinner />
      </div>
    {:else if resultState == 'idle'}
      <div class="ml-2 w-8 rounded p-2 bg-gray-300 flex items-center">
        <FaSearch />
      </div>
    {:else if resultState == 'filled'}
      <button 
        type="button" 
        class="appearance-none ml-2 w-8 rounded p-2 bg-gray-300 text-center"
        on:click={() => {
          value = null;
        }}
      >
        <FaWindowClose />
      </button>
    {/if}

  </div>
  <ul
    style={popperStyles} 
    bind:this={popperElement} 
    class="popper bg-white shadow-lg"
  >
    {#each items as item (item.id)}
      <li 
        class="px-3 py-2 border-b border-gray-300 text-gray-700 hover:bg-gray-200"
        on:click={onSelect(item)}
      >
        <slot name="item" {item}></slot>
      </li>
    {/each}
  </ul>
</div>