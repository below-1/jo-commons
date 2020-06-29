<script>
  export let to;
  export let label = '';
  export let cls = '';

  const baseClasses = "px-3 py-1 rounded bg-white border rounded border-gray-400 hover:bg-gray-200 inline-block";

  $: classes = `${baseClasses} ${cls}`;
</script>

<a
  href={to}
  class={classes}
>
  <slot>
    {label}
  </slot>
</a>
