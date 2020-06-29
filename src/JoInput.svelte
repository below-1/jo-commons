<script type="text/javascript">
  export let value;
  export let placeholder = '';
  export let min = null;
  export let max = null;
</script>

<input
  bind:value={value}
  type='text'
  placeholder={placeholder}
  class="bg-white border-gray-400 border p-2 py-1 text-sm font-semibold rounded"
/>
