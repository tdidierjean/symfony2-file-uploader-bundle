function PunkAveFileUploader(options)
{
	var self = this,
		uploadUrl = options.uploadUrl,
		viewUrl = options.viewUrl,
		$el = $(options.el),
		uploaderTemplate = _.template($.trim($('#file-uploader-template').html()));
	$el.html(uploaderTemplate({}));

	var fileTemplate = _.template($.trim($('#file-uploader-file-template').html())),
		editor = $el.find('[data-files="1"]'),
		thumbnails = $el.find('[data-thumbnails="1"]');

	self.uploading = false;

	self.errorCallback = 'errorCallback' in options ? options.errorCallback : function( info ) { if (window.console && console.log) { console.log(info) } },

		self.addExistingFiles = function(files)
		{
			_.each(files, function(file) {
				appendEditableImage({
					// cmsMediaUrl is a global variable set by the underscoreTemplates partial of MediaItems.html.twig
					'thumbnail_url': viewUrl + '/thumbnails/' + file,
					'url': viewUrl + '/originals/' + file,
					'name': file
				});
			});
		};

	// Delay form submission until upload is complete.
	// Note that you are welcome to examine the
	// uploading property yourself if this isn't
	// quite right for you
	self.delaySubmitWhileUploading = function(sel)
	{
		$(sel).submit(function(e) {
			if (!self.uploading)
			{
				return true;
			}
			function attempt()
			{
				if (self.uploading)
				{
					setTimeout(attempt, 100);
				}
				else
				{
					$(sel).submit();
				}
			}
			attempt();
			return false;
		});
	}

	if (options.blockFormWhileUploading)
	{
		self.blockFormWhileUploading(options.blockFormWhileUploading);
	}

	if (options.existingFiles)
	{
		self.addExistingFiles(options.existingFiles);
	}

	var	uploadButton = $('<button/>')
		.addClass('btn btn-primary upload')
		.prop('disabled', true)
		.text('Processing...')
		.on('click', function () {
			var $this = $(this),
				data = $this.data();
			$this
				.off('click')
				.text('Annuler')
				.on('click', function () {
					$this.remove();
					data.abort();
				});
			data.submit().always(function () {
				$this.remove();
				$('#modalCrop').modal('hide');
			});
		});

	editor.fileupload({
		previewCanvas: true,
		previewMaxWidth: 0,
		previewMaxHeight: 0,
//		previewMinWidth: 700,
		previewThumbnail: false,
		autoUpload: false,
		dataType: 'json',
		url: uploadUrl,
		dropZone: $el.find('[data-dropzone="1"]'),
		done: function (e, data) {
			if (data)
			{
				_.each(data.result, function(item) {
					appendEditableImage(item);
				});
			}
		},
		start: function (e) {
			$el.find('[data-spinner="1"]').show();
			self.uploading = true;
		},
		stop: function (e) {
			$el.find('[data-spinner="1"]').hide();
			self.uploading = false;
		}
	}).on('fileuploadadd', function (e, data) {
			data.context = $('#modalCrop .modal-body p').html('<div/>');
			$('#modalUpload').modal('hide');
			$('#modalCrop').modal({});

			$.each(data.files, function (index, file) {
				var node = $('<p/>');
				$('button.upload').remove();
				$('#modalCrop .modal-footer').append(uploadButton.clone(true).data(data));
				node.appendTo(data.context);
			});
		}).on('fileuploadprocessalways', function (e, data) {
			var index = data.index,
				file = data.files[index],
				node = $(data.context.children()[index]);
			if (file.preview) {
				node
					.prepend('<br>')
					.prepend(file.preview);
			}
			if (file.error) {
				node
					.append('<br>')
					.append(file.error);
			}
			if (index + 1 === data.files.length) {
				$('#modalCrop button.upload')
					.text('Valider')
					.prop('disabled', !!data.files.error);
			}

			// Start Jcrop after a little while
			window.setTimeout(function(){
					$('#modalCrop .modal-body canvas').Jcrop({
						aspectRatio: options.aspectRatio,// 2.925,
						setSelect: [0,100,1170,500],
						bgOpacity: 0.4,
						boxWidth: 960,
						boxHeight: 420,
						keySupport: false,
						allowSelect: false,
						onSelect: function(coords){
							$('#x').val(coords.x);
							$('#y').val(coords.y);
							$('#w').val(coords.w);
							$('#h').val(coords.h);
						},

					});
				},
				500);
		});

	// Expects thumbnail_url, url, and name properties. thumbnail_url can be undefined if
	// url does not end in gif, jpg, jpeg or png. This is designed to work with the
	// result returned by the UploadHandler class on the PHP side
	function appendEditableImage(info)
	{
		if (info.error)
		{
			self.errorCallback(info);
			return;
		}
		var li = $(fileTemplate(info));
		li.find('[data-action="delete"]').click(function(event) {
			var file = $(this).closest('[data-name]');
			var name = file.attr('data-name');
			$.ajax({
				type: 'delete',
				url: setQueryParameter(uploadUrl, 'file', name),
				success: function() {
					file.remove();
				},
				dataType: 'json'
			});
			return false;
		});

		thumbnails.append(li);
	}

	function setQueryParameter(url, param, paramVal)
	{
		var newAdditionalURL = "";
		var tempArray = url.split("?");
		var baseURL = tempArray[0];
		var additionalURL = tempArray[1];
		var temp = "";
		if (additionalURL)
		{
			var tempArray = additionalURL.split("&");
			var i;
			for (i = 0; i < tempArray.length; i++)
			{
				if (tempArray[i].split('=')[0] != param )
				{
					newAdditionalURL += temp + tempArray[i];
					temp = "&";
				}
			}
		}
		var newTxt = temp + "" + param + "=" + encodeURIComponent(paramVal);
		var finalURL = baseURL + "?" + newAdditionalURL + newTxt;
		return finalURL;
	}
}


