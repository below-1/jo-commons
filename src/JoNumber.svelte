<script type="text/javascript">
  export let value;
  export let placeholder = '';
  export let min = null;
  export let max = null;
  export let step = 1;
</script>

<input
  bind:value={value}
  type='number'
  min={min ? min : undefined}
  max={max ? max : undefined}
  step={step}
  placeholder={placeholder}
  class="bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded"
/>
