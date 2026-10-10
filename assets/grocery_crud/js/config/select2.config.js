$(function(){
	// $(".chosen-select,.chosen-multiple-select").chosen({allow_single_deselect:true});
	$(".chosen-select,.chosen-multiple-select").select2({
		placeholder: 'Select an option',
		theme: 'bootstrap-5'
	}).on('select2:opening', function(e){
		$(this).data('select2').$dropdown.find(':input.select2-search__field').attr('placeholder', 'Ketik atau Klik Pilihan').focus()
	})
});