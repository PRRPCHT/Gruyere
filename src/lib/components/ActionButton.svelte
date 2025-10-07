<script lang="ts">
	let {
		onClick,
		label,
		class: className
	}: { onClick: () => void; label: string; class?: string } = $props();
	let defaultClass =
		'btn md:w-auto bg-slate-700 hover:bg-slate-600 w-full rounded-none border-none';
	let classes = defaultClass + ' ' + className;
</script>

<button class={classes} onclick={onClick}>{label}</button>
