<script>
  import MdClose from 'svelte-icons/md/MdClose.svelte'
  import JoButton from './JoButton.svelte';

  export let show = false;
  export let width = 500;
  export let title = '';
</script>

<style type="text/css">
  .jo-dialog {
    display: none;
  }
  .jo-dialog.show {
    display: block;
  }
  .jo-dialog .layer {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>

<div 
  class="jo-dialog"
  class:show
>
  <!-- Layer -->
  <div class="layer">
    <div class="dialog shadow-xl" style={`width: ${width}px;`}>
      <div class="py-4 px-6 bg-gray-200 flex justify-between items-center border-b border-gray-400">
        <div class="font-semibold">{title}</div>
        <!-- Close icon -->
        <JoButton
          cls="px-1 py-1"
          action={() => {
            show = !show
          }}
        >
          <div class="h-4 w-4">
            <MdClose />
          </div>
        </JoButton>
      </div>
      <div class="px-6 py-4 bg-white">
        <slot></slot>
      </div>
    </div>
  </div>
</div>
