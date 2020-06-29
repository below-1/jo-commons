<script>
  export let options;
  export let value;
  export let size = 'sm';
  export let emptyLabel = 'pilih data'

  $: fullOptions = [
    { label: emptyLabel, value: null },
    ...options
  ]
</script>

<div class="inline-block relative mr-2">
  <select
    bind:value={value}
    class={`block appearance-none w-full px-4 py-1 pr-8 rounded focus:outline-none bg-white border border-gray-400 text-${size}`}
  >
    {#each fullOptions as option (option.value)}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
  </div>
</div>
