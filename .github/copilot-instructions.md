This is source code for an app so people can identify trees in their neighborhoods.

Data comes from publicly available city data maintained by their landscaping departments.  

Each city database contains several thousand entries in various formats.  When preparing the data, we extract the latitude, longitude, and botanical name.  We canonicalize the botanical name and try to correct errors in the data (e.g. typos).  The result is written into a binary file of tree sites, each of which references an entry in a binary file of tree types (e.g. species).

Data is drawn on a Google Map.
