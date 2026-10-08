/**
*	Developed by: Muchamad Desta Fadilah a.ka. topidesta
*	Website		: https://topidesta.my.id
*	Year		: 2026
*/

jQuery(document).ready(function() {

    /* source: https://stackoverflow.com/a/67184094 */
    var tokenHash=$("input[name=csrf_test_name]").val();
    
    /* console.log(current_url + '/getUserDT'); */
    column = (typeof $('#dataTables-column').html() === 'string') ? $.parseJSON($('#dataTables-column').html()) : {};
    $setting = $('#dataTables-setting');
    var order = "";
    if ($setting.length > 0) {
        setting = $.parseJSON($('#dataTables-setting').html());
        order = setting.order;
    }
    url = $('#dataTables-url').html();
    table = $('#table-result').DataTable({
        "processing": true,
        "serverSide": true,
        "scrollX": true,
        "order": order,
        "ajax": {
            "url": url,
            "type": "POST",
            "data": function (d) {
                var cName = typeof csrfName !== 'undefined' ? csrfName : 'csrf_test_name';
                var cToken = $('meta[name="' + cName + '"]').attr('content') || $('input[name="' + cName + '"]').val();
                d[cName] = cToken;
            }
        },
        "columns": column,
        "initComplete": function(settings, json) {
            table.rows().every(function(rowIdx, tableLoop, rowLoop) {
                $row = $(this.node());
                /* this
                	.child(
                		$(
                			'<tr>'+
                				'<td>'+rowIdx+'.1</td>'+
                				'<td>'+rowIdx+'.2</td>'+
                				'<td>'+rowIdx+'.3</td>'+
                				'<td>'+rowIdx+'.4</td>'+
                			'</tr>'
                		)
                	)
                	.show(); */
            });
        }
    });

});