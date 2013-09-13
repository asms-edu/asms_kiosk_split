(function () {
    "use strict";

    //Set up array vars
    var dataPromises = [];
    var blogs = [
        {
            key: "asmsBlog",
            url: "http://blogs.windows.com/windows/b/windowssecurity/atom.aspx",
            title: "tbd", updated: "tbd",
            acquireSyndication: acquireSyndication, dataPromise: null
        },
        {
            key: "blog4",
            url: 'http://blogs.windows.com/windows/b/business/atom.aspx',
            title: 'tbd', updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null
        },
        {
            key: "blog5",
            url: 'http://blogs.windows.com/windows/b/bloggingwindows/atom.aspx',
            title: 'tbd', updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null
        },
        {
            key: "blog6",
            url: 'http://blogs.windows.com/windows/b/windowssecurity/atom.aspx',
            title: 'tbd', updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null
        },
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
        getFeeds().then(function () {
            //process each blog
            blogs.forEach(function (feed) {
                feed.dataPromise.then(function (articlesResponse) {
                    var articleSyndication = articlesResponse.responseXML;

                    if (articleSyndication) {
                        //get blog title
                        feed.title = articleSyndication.querySelector("feed > title").textContent;

                        // Use the date of the latest post as the last updated date
                        var published = articleSyndication.querySelector("feed > entry > published").textContent;

                        // convert date for display
                        var date = new Date(published);
                        console.log(published, date);
                        var dateFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("year month day");
                        var blogDate = dateFmt.format(date);
                        feed.updated = "Last updated " + blogDate;

                        //get the blog posts
                        getItemsFromXml(articleSyndication, blogPosts, feed);
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

    function getItemsFromXml(articleSyndication, bPosts, feed) {
        //get info for each blog
        var posts = articleSyndication.querySelectorAll("entry");
        //process each blog post
        for (var postIndex = 0; postIndex < posts.length; postIndex++) {
            var post = posts[postIndex];

            //get the title, author and date published
            var postTitle = post.querySelector("title").textContent;
            var postAuthor = post.querySelector("author").textContent;
            var postPublished = post.querySelector("published").textContent;

            //convert date for display
            //var postDate = new Date(postPublished);
            //var monthFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("month.abbreviated");
            //var dayFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("day");
            //var yearFmt = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter("year.full");
            //var blogPostMonth = monthFmt.format(postDate);
            //var blogPostDay = dayFmt.format(postDate);
            //var blogPostYear = yearFmt.format(postDate);
            //var blogPostDate = new Windows.Globalization.DateTimeFormatting.DateTimeFormatter(postDate);

            //process content so it displays nicely
            var staticContent = toStaticHTML(post.querySelector("content").textContent);

            // Store post info we care about in the array
            bPosts.push({
                group: feed,
                key: feed.title,
                title: postTitle,
                author: postAuthor,
                //month: blogPostMonth.toUpperCase(),
                //day: blogPostDay,
                //year: blogPostYear,
                date: "18-07-1992",
                content: staticContent
            });
        }
    }

    var list = getBlogPosts();
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
})();