# battlemap
A virtual tabletop for TTRPGs

Mainly built for DnD but should work for almost every game.

## Features
 - Shared online maps that every player can manipulate
 - Coloring of the map and assigning portraits to tokens
 - Shadows and lighting, with DnD-style darkvision
 - Areas of effect (circles, cones, lines, cubes)
 - Initiative Tracker

## Hosting
To start the server, simply run `dotnet run`.
By default, the server listens on port 8000 in debug, and 5000 in release mode.
Check the index page for usage notes.

Run `make index` to swap the english index page for the german one and vice versa.

### Installing
A SystemD service file (`battlemap.service`) is included.
It expects an executable in /srv/battlemap and a user called battlemap.
Use `make install` to compile to that directory. (automatically starts/stops the service)
