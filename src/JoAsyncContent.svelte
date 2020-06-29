<script>
  import JoSpinner from './JoSpinner.svelte';
  import JoErrorPane from './JoErrorPane.svelte';

  export let networkStatus;
  export let errorMessage = 'terjadi kesalahan';
</script>

{#if (networkStatus == 'success')}
  <slot name="success"></slot>
{:else if (networkStatus == 'ready')}
  <slot name="ready"></slot>
{:else if (networkStatus == 'loading')}
  <JoSpinner />
{:else if (networkStatus == 'error')}
  <JoErrorPane message={errorMessage} />
{/if}
