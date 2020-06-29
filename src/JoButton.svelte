<script>
  export let label = null;
  export let action = null;
  export let disabled = false;
  export let color = null;
  export let dark = false;
  export let cls = '';

  const baseClasses = "px-4 py-1 rounded disabled:opacity-50"
  $: colors = dark 
    ? (color 
      ? `bg-${color}-700 text-white` 
      :  'bg-gray-900 text-white')
    : 'bg-white border border-gray-400';
  $: classes = `${baseClasses} ${colors} ${cls}`
</script>

<button 
  on:click={action}
  type="button"
  disabled={disabled}
  class={classes}
>
  <slot>
    {#if label}
      {label}
    {/if}
  </slot>
</button>
