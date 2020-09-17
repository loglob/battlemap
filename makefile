serviceStatus = $(shell systemctl is-active battlemap)

run:
	dotnet build
	xdg-open "http://localhost:8000"
	dotnet run

clean:
	rm -rf bin

index:
	if [ -e "wwwroot/index.en.html" ]; then \
		mv wwwroot/index.html wwwroot/index.de.html; \
		mv wwwroot/index.en.html wwwroot/index.html; \
	else \
		mv wwwroot/index.html wwwroot/index.en.html; \
		mv wwwroot/index.de.html wwwroot/index.html; \
	fi


install:
	mkdir -p /srv/battlemap
	dotnet publish --self-contained -c Release -r linux-x64 -p:PublishSingleFile=true

	if [ $(serviceStatus) = "active" ]; then sudo service battlemap stop; fi;

	cp -r bin/Release/netcoreapp3.0/linux-x64/publish/* /srv/battlemap
	
	if [ $(serviceStatus) = "active" ]; then sudo service battlemap start; fi;
