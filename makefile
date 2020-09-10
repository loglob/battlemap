serviceStatus = $(shell systemctl is-active battlemap)

run:
	dotnet build
	xdg-open "http://localhost:8000"
	dotnet run

clean:
	rm -rf bin

install:
	mkdir -p /srv/battlemap
	if [ $(serviceStatus) = "active" ]; then sudo service battlemap stop; fi;
	
	dotnet publish --self-contained -c Release -r linux-x64 -p:PublishSingleFile=true
	cp -r bin/Release/netcoreapp3.0/linux-x64/publish/* /srv/battlemap
	
	if [ $(serviceStatus) = "active" ]; then sudo service battlemap start; fi;
