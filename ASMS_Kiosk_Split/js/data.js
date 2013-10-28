(function () {
    "use strict";

    //Set up array vars
    var dataPromises = [];
    var blogs = [
        {
            key: "asmsBlog",
            url: "http://asms.sa.edu.au/feed/",
            title: "Latest ASMS News", updated: "tbd",
            acquireSyndication: acquireSyndication, dataPromise: null,
            thumbnailImage: "/images/illustration/spacewoman.tif"
        },
        {
            key: "asmsEvents",
            url: 'http://asms.sa.edu.au/events/event/feed/',
            title: 'Upcoming ASMS Events', updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null,
            thumbnailImage: "/images/illustration/diver.tif"
        },
        {
            key: "asmsPD",
            url: "http://online.asms.sa.edu.au/feed/",
            title: "ASMS Professional Learning Blog", updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null,
            thumbnailImage: "/images/illustration/solder.tif"
        }
    ];

    // Create data binding for our ListView
    var blogPosts = new WinJS.Binding.List();

    // Process the blogs feed
    function getFeeds() {
        // create object for each feed in blogs array
        // get the content for each feed
        blogs.forEach(function (feed) {
            feed.dataPromise = feed.acquireSyndication(feed.url);
            dataPromises.push(feed.dataPromise);
        });
        // return when all async operations are complete
        return WinJS.Promise.join(dataPromises).then(function () {
            return blogs;
        });
    }

    function acquireSyndication(url) {
        // call xhr for the URL to get results aynchronously
        return WinJS.xhr(
            {
                url: url,
                headers: { "If-Modified-Since": "Mon, 27 Mar 1972 00:00:00 GMT" }
            }
        );
    }
    //this function gets the blog posts but because its in XML we need to get the text from it so we use the getItemsFromXml function.
    function getBlogPosts() {
        // walk the results to retrieve blog posts
        getFeeds().then(function() {
            //process each blog
            blogs.forEach(function (feed) {
                feed.dataPromise.then(function (articlesResponse) {
                    var articleSyndication = articlesResponse.responseXML;

                    if (articleSyndication) {
                        //get blog title
                        //feed.title = articleSyndication.querySelector("channel > title").textContent;
                        
                        // Use the date of the latest post as the last updated date
                        var published = articleSyndication.querySelector("channel > lastBuildDate").textContent;
                        
                        // convert date for display
                        var date = new Date(published);
                        
                        var dateFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("year month day");
                        var blogDate = dateFmt.format(date);
                        feed.updated = "Last updated " + blogDate;

                        //get the blog posts
                        getItemsFromXml(articleSyndication, blogPosts, feed); //this is the return of the function - look here!
                    } else {
                        //return error from loading blogs
                        feed.title = "Error loading blog";
                        feed.updated = "Error";
                        blogPosts.push({
                            group: feed,
                            key: "Error loading blog",
                            title: feed.url,
                            author: "Unknown",
                            month: "?",
                            day: "?",
                            year: "?",
                            content: "Unable to load the blog at " + feed.url
                        });
                    }
                });
            });
        });
        return blogPosts;
    }
    //this function is called by getBlogPosts() - don't look here
    function getItemsFromXml(articleSyndication, bPosts, feed) {
        //get info for each blog
        var posts = articleSyndication.querySelectorAll("item");
        //process each blog post
        for (var postIndex = 0; postIndex < posts.length; postIndex++) {
            var post = posts[postIndex];

            //get the title, author and date published
            var postTitle = post.querySelector("title").textContent;
            var postAuthor = post.querySelector("creator").textContent;
            var postPublished = post.querySelector("pubDate").textContent;

            //convert date for display
            var postDate = new Date(postPublished);
            var monthFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.abbreviated");
            var dayFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("day");
            var yearFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("year.full");
            var blogPostMonth = monthFmt.format(postDate);
            var blogPostDay = dayFmt.format(postDate);
            var blogPostYear = yearFmt.format(postDate);
            var blogPostDate = blogPostDay + " " + blogPostMonth + " " + blogPostYear;
            // var blogPostImage is declared lower in the page and gets a thumbnail from the RSS

            // Process content so it displays nicely
            var staticContent = toStaticHTML(post.querySelector("encoded").textContent);

            // We get the textcontent from the description tag in the RSS feed
            var staticDesc = toStaticHTML(post.querySelector("description").textContent);

            // Create a new div element to store our textContent HTML in. If we don't use this we can't access the img tag.
            var containerDiv = document.createElement('div');
            containerDiv.innerHTML = toStaticHTML(post.querySelector("description").textContent);

            // If there is an img tag we get the first one (WP Plugin will store the thumbnail image as the first element/img tag)
            if (containerDiv.getElementsByTagName("img")[0] !== undefined) {
                // Make blogPostImage the src attribute of the first img element. We only need the src attribute because of data binding in the split.html file.
                var blogPostImage = containerDiv.getElementsByTagName("img")[0].getAttribute('src');
            } else {
                // If post thumbnail is not set we replace it with a picture of the ASMS logo.
                var blogPostImage = "/images/asms-logo.png";
            }

            // Store post info we care about in the array
            bPosts.push({
                group: feed,
                key: feed.title,
                title: postTitle,
                author: postAuthor,
                date: blogPostDate,
                thumbnailImage: blogPostImage,
                content: staticContent
            });
        }
    }

    var list = getBlogPosts();
    var staticContentList = new WinJS.Binding.List;
    // Uses the generateStaticContent for item content
    generateStaticContent().forEach(function (item) {
        list.push(item);
    });
    // Uses the generateGalleryData for item content commented out for 1.0 release
    /*generateGalleryData().forEach(function (item) {
        list.push(item);
    });*/
    var groupedItems = list.createGrouped(
        function groupKeySelector(item) { return item.group.key; },
        function groupDataSelector(item) { return item.group; }
    );

    WinJS.Namespace.define("Data", {
        items: groupedItems,
        groups: groupedItems.groups,
        getItemReference: getItemReference,
        getItemsFromGroup: getItemsFromGroup,
        resolveGroupReference: resolveGroupReference,
        resolveItemReference: resolveItemReference
    });

    // Get a reference for an item, using the group key and item title as a
    // unique reference to the item that can be easily serialized.
    function getItemReference(item) {
        return [item.group.key, item.title];
    }

    // This function returns a WinJS.Binding.List containing only the items
    // that belong to the provided group.
    function getItemsFromGroup(group) {
        return list.createFiltered(function (item) { return item.group.key === group.key; });
    }

    // Get the unique group corresponding to the provided group key.
    function resolveGroupReference(key) {
        for (var i = 0; i < groupedItems.groups.length; i++) {
            if (groupedItems.groups.getAt(i).key === key) {
                return groupedItems.groups.getAt(i);
            }
        }
    }

    // Get a unique item from the provided string array, which should contain a
    // group key and an item title.
    function resolveItemReference(reference) {
        for (var i = 0; i < groupedItems.length; i++) {
            var item = groupedItems.getAt(i);
            if (item.group.key === reference[0] && item.title === reference[1]) {
                return item;
            }
        }
    }

    function generateStaticContent() {
        var thumbnailImage = "http://placehold.it/150x150";
        var staticGroups = [
            { 
                key: "maps", 
                title: "Maps of the ASMS buildings",  
                updated: "Last updated: 18 September 2013",
                thumbnailImage: "/images/illustration/chemcity.tif",
            },
            {
                key: "webLinks",
                title: "Links for the ASMS",
                updated: "Last updated: 18 September 2013",
                thumbnailImage: "/images/illustration/robotics.tif"
            },
        ];
        var staticItems = [
            {
                group: staticGroups[0],
                title: "ASMS Ground Floor",
                author: "An annotated map of the ASMS ground floor",
                date: "18 Sep 2013",
                content: "<img src='/images/groundmap.png' />",
                thumbnailImage: thumbnailImage
            },
            {
                group: staticGroups[0],
                title: "ASMS First Floor",
                author: "An annotated map of the ASMS first floor",
                date: "18 Sep 2013",
                content: "<img src='/images/firstmap.png' />",
                thumbnailImage: thumbnailImage
            },
            {
                group: staticGroups[0],
                title: "Sturt Buildings",
                author: "A map of the Sturt buildings",
                date: "18 Sep 2013",
                content: "<img src='/images/sturtmap.png' />",
                thumbnailImage: thumbnailImage
            },
            {
                group: staticGroups[1],
                title: "ASMS Public Website",
                author: "Australian Science and Mathematics School",
                date: "18 Sep 2013",
                content: "<a href='http://www.asms.sa.edu.au'>Follow this link to the public website</a>",
                thumbnailImage: thumbnailImage
            },
            {
                group: staticGroups[1],
                title: "ASMS Portal",
                author: "Australian Science and Mathematics School",
                date: "18 Sep 2013",
                content: "<a href='http://portal.asms.sa.edu.au'>Follow this link to the Portal</a>",
                thumbnailImage: thumbnailImage
            },
            {
                group: staticGroups[1],
                title: "Timetabler",
                author: "Access your timetable",
                date: "18 Sep 2013",
                content: "<a href='http://portal.asms.sa.edu.au/timetabler'>Follow this link to your timetable</a>",
                thumbnailImage: thumbnailImage
            },
        ];

        return staticItems;
    }

    function generateGalleryData(pathList, pathArray) {
        var galleryItems = [];
        var thumbnailImage = "http://placehold.it/150x150";
        var galleryGroups = [
            {
                key: "photoGalleries",
                title: "Photo Galleries",
                updated: "Last updated: 19 September 2013"
            }
        ];
        if (pathArray !== undefined && pathArray.length > 0) {
            pathArray.forEach(function (item) {
                galleryItems.push({
                    group: galleryGroups[0],
                    title: item.name,
                    author: "nerd",
                    date: "datedate",
                    content: "<img src='" + "item.path" + "' />",
                    thumbnailImage: thumbnailImage
                });
            })
        } else {
            galleryItems.push({
                group: galleryGroups[0],
                title: "No galleries available",
                author: "No data",
                date: "No data",
                content: "No data available",
                thumbnailImage: thumbnailImage
            });
        }
        return galleryItems;
    }
    
    function getPictureItems() {
        var pathArray = [];
        var picturesLibrary = Windows.Storage.KnownFolders.picturesLibrary;
        //this function is named after a person on Freenode in #Startups that helped me solve the problem of async not creating the variables when I needed them
        var ffWacom = function (items) {
            items.forEach(function (item) {
                pathArray.push({
                    name: item.name,
                    path: item.path
                });
            });
            var pathList = new WinJS.Binding.List(pathArray);
            generateGalleryData(pathList, pathArray);
        };
        picturesLibrary.getItemsAsync().then(ffWacom);
    }
    getPictureItems();
})();