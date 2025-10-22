using CommandLine;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json;

namespace cli.Verbs
{
	[Verb("extract")]
	class Extract
	{
		[Value(0, Required = true)]
		public string FilePath { get; set; } = null!;

		public async Task Do(ILogger<Extract> logger)
		{
			var file = new FileInfo(FilePath!);
			using var fileStream = file.OpenRead();

			using var http = new HttpClient();
			using var response = await http.PostAsync(
				requestUri: "https://localhost:7026/extract",
				content: new MultipartFormDataContent
				{
					{ new StreamContent(fileStream), "file", file.Name.ToLower() }
				});

			response.EnsureSuccessStatusCode();
			var content = await response.Content.ReadFromJsonAsync<JsonElement>();
			Json.Out(content);
		}
	}
}
