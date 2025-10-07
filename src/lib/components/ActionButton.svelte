<script lang="ts">
	let {
		onClick,
		label,
		class: className
	}: { onClick: () => void; label: string; class?: string } = $props();
	let defaultClass = 'btn md:w-52 bg-slate-700 hover:bg-slate-600 w-full rounded-none';
	let classes = defaultClass + ' ' + className;
</script>

<button class={classes} onclick={onClick}>{label}</button>
