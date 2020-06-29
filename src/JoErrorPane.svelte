<script>
  import MdWarning from 'svelte-icons/md/MdWarning.svelte'

  export let message;
</script>

<div class="w-full p-12 flex flex-col items-center justify-center bg-gray-200">
  <div class="h-32 w-32 text-gray-700">
    <MdWarning />
  </div>
  <div class="text-red-700 font-bold text-xl">{message}</div>
</div>
