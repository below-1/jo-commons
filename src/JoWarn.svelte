<script>
  import MdWarning from 'svelte-icons/md/MdWarning.svelte'
  import JoButton from './JoButton.svelte';

  export let warning;
  
  async function on_next () {
    if ($warning.on_next) {
      await $warning.on_next()
    }
    warning.hide()
  }
</script>

{#if $warning.value}
<div 
  class="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center"
  style="background: rgba(250, 250, 250, 0.2);"
>
  <div class="w-1/3 shadow-xl rounded bg-white">
    <div class="flex items-center border-b border-gray-400 px-6 py-2 bg-gray-300">
      <div class="h-8 w-8 text-red-700 mr-2">
        <MdWarning />
      </div>
      <div class="font-semibold text-lg">Peringatan!</div>
    </div>
    <div class="px-4 py-2">
      <div class="font-medium">{$warning.message}</div>
      <div class="py-4">
        <JoButton
          action={on_next}
          dark={true}
          color="red"
          cls="mr-2"
        >
          lanjutkan
        </JoButton>
        <JoButton
          action={() => warning.hide()}
        >
          batal
        </JoButton>
      </div>
    </div>
  </div>
</div>
{/if}