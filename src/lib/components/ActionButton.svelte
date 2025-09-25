<script lang="ts">
	let {
		onClick,
		label,
		class: className
	}: { onClick: () => void; label: string; class?: string } = $props();

	let defaultClass = 'btn btn-outline btn-primary';
	let classes = defaultClass + ' ' + className;
</script>

<button class={classes} onclick={onClick}>{label}</button>
