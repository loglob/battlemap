using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using battlemap.Hubs;
using Microsoft.AspNetCore.SignalR;
using battlemap.Util;

namespace battlemap
{
	public class Startup
	{
		public static IHubContext<MapHub> MapHubContext;

		public Startup(IConfiguration configuration)
		{
			Configuration = configuration;
		}

		public IConfiguration Configuration { get; }

		// This method gets called by the runtime. Use this method to add services to the container.
		public void ConfigureServices(IServiceCollection services)
		{
			services.AddControllersWithViews();
			services.AddSignalR();
		}

		// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
		public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IHostApplicationLifetime lifetime)
		{
			if (env.IsDevelopment())
			{
				app.UseDeveloperExceptionPage();
			}
			else
			{
				app.UseExceptionHandler("/Home/Error");
				// The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
				//app.UseHsts();
			}
			
			//app.UseHttpsRedirection();

			app.UseDefaultFiles();
			app.UseStaticFiles();

			
			app.UseRouting();

			app.UseAuthorization();

			app.UseEndpoints(endpoints =>
			{
				endpoints.MapControllerRoute(
					name: "default",
					pattern: "{controller=Home}/{action=Index}/{id?}");
				endpoints.MapHub<MapHub>("/mapHub");
			});

			MapHubContext = app.ApplicationServices.GetService<IHubContext<MapHub>>();
			lifetime.ApplicationStopping.Register(OnShutdown);
		}
 
		public void OnShutdown()
		{
			Console.WriteLine("Shutting down...");
			State.BackUpInterval = 0;
			long w = State.Save();
			Console.WriteLine($"Wrote {w.ToDataUnit()}");
		}
	}
}
