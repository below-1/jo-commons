<script>
  export let options;
  export let group;
  export let cls;

  $: classes = `flex flex-col text-sm ${cls}`
</script>

<div class={classes}>
  {#each options as option}
    <div class="flex items-center text-gray-800 mb-1">
      <input 
        bind:group={group}
        type="radio"
        value={option.value}
        class="jo-radio appearance-none rounded-full border-2 border-gray-600 p-2 mr-2"
      />
      <label>{option.label}</label>
    </div>
  {/each}
</div>
