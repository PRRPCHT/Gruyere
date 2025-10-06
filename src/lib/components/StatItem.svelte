<script lang="ts">
	let {
		label,
		value,
		backgroundColor = ''
	}: { label: string; value: number | string | undefined; backgroundColor: string } = $props();
</script>

<div class="flex w-full flex-row justify-between py-2 {backgroundColor}">
	<div class="px-4 py-2">{label}</div>
	<div class="px-4 py-2">
		{value ?? '-'}
	</div>
</div>
