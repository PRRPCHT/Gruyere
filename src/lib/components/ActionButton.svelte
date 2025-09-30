<script lang="ts">
	let {
		onClick,
		label,
		class: className
	}: { onClick: () => void; label: string; class?: string } = $props();
	let defaultClass = 'btn md:w-52 bg-gray-700 hover:bg-primary w-full';
	let classes = defaultClass + ' ' + className;
</script>

<button class={classes} onclick={onClick}>{label}</button>
