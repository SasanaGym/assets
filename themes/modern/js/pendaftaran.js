$(document).ready(function() {
	
	
	function generate_options(json) {
		options = '';
		$.each(json, function(i, v) {
			options += '<option value="' + i + '">' + v + '</option>';
		})
		
		return options;
	}
	
	function set_options($elm, url) 
	{
		let $next_option = '';
		let $caraMasuk = '';
		let urlCaraMasuk = '';
		const value = $elm.val();

		if ($elm.hasClass('prosedur_masuk'))
		{
			$caraMasuk = $('.cara_masuk').prop('disabled', true);
			$next_option = $('.cara_masuk');
			urlCaraMasuk = 'masterdata/lainlain/ajaxCaraMasuk?id=' + value
		} 
		
		if (!$next_option || ! $caraMasuk) {
			return false;
		}
		
		$spinner = $('<div class="spinner-border spinner-border-md" role="status" style="width: 1.5rem; height: 1.5rem; position:absolute; right: -27px; top:5px"></div>');
		
		$wrapper = $('<div>').css('position', 'relative');
		$wrapper.insertAfter($next_option);
		$wrapper.append($spinner);

		$.getJSON(base_url + urlCaraMasuk, function(data) 
		{
			console.log('ff');
			new_options = generate_options(data);
			$caraMasuk.each (function(i, elm) 
			{
				$elm = $(elm);
				teks = '-- Pilih Prosedure --';
				if ($elm.hasClass('cara_masuk')) {
					teks = '-- Pilih Cara Masuk --';
				}
				
				if (i == 0) {
					$elm.prop('disabled', false)
				}
				$elm
					.empty()
					.append(new_options)
					.prepend('<option value="">' + teks + '</option>')
					.val('');
				$wrapper.remove();
			});
		});
	}

	$('.prosedur_masuk').change(function() {
		set_options($(this));
	});
})