<script type="text/javascript">
  import { onMount, setContext } from 'svelte'
  export let notification;
  let background = 'bg-blue-600';
  $: {
    switch ($notification.type) {
      case 'info':
        background = 'bg-blue-600';
        break;
      case 'success':
        background = 'bg-green-600';
        break;
      case 'warning':
        background = 'bg-orange-600';
        break;
      case 'danger':
        background = 'bg-red-600';
        break;
      default:
        break;
    }
  };

  $: hidden = $notification.value ? 'flex' : 'hidden';
  $: classes = `jo-notification h-16 w-full md:w-1/3 md:rounded md:shadow-xl fixed text-white items-center justify-start p-4 bg-gray-800 text-white text-lg ${hidden}`;

</script>

<style>
  .jo-notification {
    bottom: 8px;
    left: 8px;
  }
</style>

<div 
  class={classes}
>
  { $notification.message }
</div>
