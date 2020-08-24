# battlemap
An online battlemap for TTRPGs

## Usage
The path `/map/` always creates and redirects to a new, empty map.
Append or remove `&dm=true` to/from the URL to toggle DM view.

## install
A SystemD service file (`battlemap.service`) is included.
It expects an executable in /srv/battlemap.
Use ```make install``` to compile to that directory. (automatically starts/stops the service)