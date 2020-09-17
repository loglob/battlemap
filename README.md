# battlemap
An online battlemap for TTRPGs

## Usage
To start the server, simply run `dotnet run`.
By default, the server listens on port 8000/8001 in debug, and 5000/5001 in release mode.
Check the index page for usage notes.

Run `make index` to swap the english index page for the german one and vice versa.

## install
A SystemD service file (`battlemap.service`) is included.
It expects an executable in /srv/battlemap.
Use `make install` to compile to that directory. (automatically starts/stops the service)