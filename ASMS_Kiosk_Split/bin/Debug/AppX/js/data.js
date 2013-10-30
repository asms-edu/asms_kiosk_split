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
            thumbnailImage: "/images/thumbnails/thumbnail4.jpg"
        },
        {
            key: "asmsEvents",
            url: 'http://asms.sa.edu.au/events/feed/',
            title: 'Upcoming ASMS Events', updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null,
            thumbnailImage: "/images/thumbnails/thumbnail5.jpg"
        },
        {
            key: "asmsPD",
            url: "http://online.asms.sa.edu.au/feed/",
            title: "ASMS Professional Learning Blog", updated: 'tbd',
            acquireSyndication: acquireSyndication, dataPromise: null,
            thumbnailImage: "/images/thumbnails/thumbnail6.jpg"
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
                var blogPostImage = "/images/logos/asms-logo.png";
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
                thumbnailImage: "/images/thumbnails/thumbnail3.jpg",
            },
            {
                key: "webLinks",
                title: "Important Web Links",
                updated: "Last updated: 18 September 2013",
                thumbnailImage: "/images/thumbnails/thumbnail7.jpg"
            },
            {
                key: "aboutASMS",
                title: "About the ASMS",
                updated: "Last updated 29 October 2013",
                thumbnailImage: "/images/thumbnails/thumbnail1.jpg"
            }
        ];

        var staticContent = [
            // Position #0
            "<div class='faq-slide'>"+

            "<h2 class='first'>What are the fees at the ASMS?</h2>" +
            "<p>Fees are $880 in 2013. Information about the fees is available from the ASMS Business Manager.</p>" +

            "<h2>How many students are at the ASMS?</h2>" +
            "<p>There are approximately 360 students at the school this year.</p>" +

            "<h2>What Year 12 subjects are offered at the ASMS?</h2>" +
            "<p>The ASMS provides a range of Year 12 subjects to ensure that all students are able to meet the SACE requirements. All students are required to do the Research Project. Other subjects currently offered include: Biology, Chemistry, Physics, Psychology, Geology, Specialist Mathematics, Mathematical Studies, English Communications, English Studies, English as a Second Language, Modern History, Scientific Studies (Aviation), Scientific Studies (Human Performance), Media Production and Analysis, and Geography.</p>" +
            "<p>We can also arrange for students to attend other local high schools to complete other subjects eg Art, Music or a language. Year 12 class numbers are between 16 and 25.</p>" +

            "<h2>What kind of results have the ASMS Year 12 students achieved?</h2>" +
            "<p>Students of the ASMS consistently achieve results above state average at Year 12 level. In 2011 30% of ASMS students achieved an ATAR over 90 (i.e. in the top 10% of the state) and 50% of students achieved an ATAR over 80 (i.e. in the top 20% of the state)." +
            "<p>The majority of ASMS students are focused on pathways to further education and each year more than 90% of students graduating from the ASMS go on to study at university or TAFE.</p>" +

            "<h2>Is the ASMS school building different from other schools?</h2>" +
            "<p>The ASMS building is open, flexible, and ICT enabled. Its modern design and IT infrastructure ensures that students can work with each to learn and access the online resources. Large groups of students and grouped with teams of teachers to enable a wide range of expertise to be available to the students.</p>" +
            "<p>The OECD (Organisation for Economic Cooperation and Development) included the ASMS building in the third International Compendium of Exemplary Educational Facilities.</p>" +

            "<h2>When you talk about the success of students at the ASMS, what data do you base this on?</h2>" +
            "<p>As well as the SACE results, the school collects data about student satisfaction (using ACER School Life Questionnaire), self-directed learning abilities (school based inventory), participation in the Extended Learning Opportunities and the ASMS Graduate Capabilities (details under the curriculum tab of the website).</p>" +
            "<p>Success as an ASMS student is not just about academic achievement. It involves their personal development as a good person, and their development as a self-directed learner that will underpin further academic and career success and their inclination to take on new opportunities.</p>" +

            "<h2>Do students need their own laptops?</h2>" +
            "<p>Computing devices are now part of everyday life. The ASMS curriculum is online and available 24/7.</p>" +
            "<p>We encourage students to bring their own device to school each day.  Students are responsible for these devices and are encouraged to bring them fully charged. The school can connect most devices and the specifications are the choice of the parent and child. Contact ASMS ICT Services if you have questions.</p>" +

            "<h2>What is a normal school day?</h2>" +
            "<p>The school is open from 7:45am - 5:00pm each day.</p>" +
            "<p>Except for Tuesday, classes begin at 8:40 and finish at 3:20. On Tuesdays, classes finish at 1:00pm to allow time for staff Professional Development.</p>" +
            "<p>Students may stay at school on Tuesday afternoons to access support teachers who are available from 2:00 - 3:20 to support their learning, or they can continue with private or group study.</p>" +

            "<h2>What type of report can I expect?</h2>" +
            "<p>The ASMS curriculum is online and this includes the assessment results. Teachers enter results and comments into the portal as they are completed. At the end of each semester a final report for that semester is posted on the portal. In term 1 and 3, students hold a learning conversation with their parents and Tutor where they present and discuss the progress of their learning.</p>" +

            "<h2>What happens if my child starts to struggle with their learning?</h2>" +
            "<p>The Tutor is central to supporting the student.  The Tutor monitors each student’s performance and behaviour and provides timely intervention.  Parents should contact their child’s Tutor as soon as they perceive there is an issue.  The Tutor will contact the parent if concerns are raised at the school level.</p>"+  
            "<p>The ASMS Student Support Team meets weekly and considers feedback provided by teachers about individual student progress.  This information is used to identify students who may require targeted support.  For more information contact <a href='mailto:bronte.nicholls@asms.sa.edu.au'>Bronte Nicholls</a>.</p>" +

            "<h2>What is the best way to communicate with the school?</h2>" +
            "<p>It depends what the issue is. For personal or academic issues about your child, contact the tutor via email. You can make a phone call, however teachers are mostly teaching and may not be available.</p>" +

            "<p>If the issue is a general issue, please discuss the matter with the receptionist who will direct your call to the relevant person. If the matter is about a teacher please contact the Principal by phone or email.</p> " +

            "<p>If you have any other questions please contact the Principal, <a href='mailto:susan.hyde@asms.sa.edu.au'>Susan Hyde</a> on 8201 5686</p></div>",

            // Position #1
            "<p>The Australian Science and Mathematics School (ASMS) is a specialist public school and is a key innovation that supports the South Australian Government’s STEM strategy. " +
            "The school caters for the three final years of schooling (year 10-12) before entry into higher education. Established in 2003, its award winning and purpose-built facility provides "+
            "an open learning environment and is designed to promote and support collaborative, student-directed learning through an engaging innovative curriculum.</p>" +

            "<p>The ASMS innovative program aims to enhance the confidence of our students to succeed at a high level so that they become nationally and internationally acclaimed thinkers and " +
            "leaders in their chosen field.</p>" +

            "<p>The school’s partnership with Flinders University is of central importance. It provides the opportunity for rich interaction between students, teachers, research scientists and " +
            "education academics in their search for innovative and challenging teaching and learning in science and mathematics.</p>" +

            "<p>ASMS students seek to focus their passion for science and mathematics. They want to learn the science and mathematics of their 21st century world, connected to social issues " +
            "and technological advances. They want to be challenged and responsible for their learning and be able to engage with their program 24/7. Above all, they want to be treated as "+
            "individuals. Our students are supported to identify their talents and interests and develop their capabilities and qualities. We support them with our unique learning program "+
            "designed to support self-directed learners, and with our online curriculum available 24/7 to students and parents through the ASMS portal.</p>" +

            "<p>ASMS students (both local and international students) share the best ideas and programs with kindred schools in other parts of the world, through student and staff exchanges" +
            "and the use of ICT. Our teachers share this vision with colleagues in local, national and international professional development forums.</p>",

            // Position #2
            "<p>The future directions of the ASMS will be found through building upon the school’s charter on establishment in 2003 and on its growth and development thereafter. The elements of the charter that are fundamental to the future development of the ASMS are described through:"+
            
            "<h2>Strategic Foundations</h2>" + 
            "<p>The ASMS is a public senior secondary school with a special focus on science and mathematics education. The school exists in partnership with Flinders University to engage in development and research to transform science and mathematics education in South Australia, nationally and internationally."+
            
            "<h2>Cohesive Culture</h2>" + 
            "<p>The ASMS engages and educates a diverse group of students, irrespective of social, cultural or educational background, around their common interest in science and mathematics. Social cohesion of the school community, where individuality and collaboration are equally valued, is the hallmark of life at the ASMS. Fulfillment of each student’s potential is a focus."+
            
            "<h2>Learning Community Design</h2>" +
            "<p>Learning is achieved in a highly collaborative setting, where interaction amongst students and educators is pervasive. The school is personalising learning opportunities for its students through inquiry- based pedagogies, applications of leading edge technologies and through engaging with a comprehensive curriculum, presented through an interdisciplinary framework by multi-disciplinary teams of educators."+
            
            "<h2>Schoolwide Approach to Learning</h2>" +
            "<p>The ASMS community has an unrelenting focus on generating learning. Its focus is on fulfilling the potential of its students through engaging each student in planning, reviewing, reflecting and re-shaping their learning. With special attention given to rigorous, leading edge science and mathematics, inquiry, collaboration, problem solving and authentic assessment drive the teaching and learning activities."+
            
            "<h2>Professional Supports</h2>" +
            "<p>The ASMS maintains an unrelenting focus on the professional learning of all staff to strengthen valued outcomes for all learners. Professional learning takes many forms, is deeply embedded in the daily activities of staff and is the key driver of innovation, development and transformation in science and mathematics education at the ASMS. Informing professional practice with educators across SA, nationally and internationally is a priority for the ASMS. The ASMS strives to continuously improve its capacity for innovation and the provision of a high quality educational environment. As a school we recognize the importance of health and well being of all staff in achieving our goals."+

            "<a href='https://www.asms.sa.edu.au/wp-content/uploads/2012/08/Strategic-Plan-2010-2014-11-12-priorities-GC-approved-0908111.pdf'>Strategic Plan 2010 - 2014</a>",

            // Position #3
            "<p>The world of scientific knowledge and scientific understanding is growing and changing at an ever increasing rate. New scientific research is challenging and changing many old concepts of science. Commercial, industrial and social applications of new science ideas are transforming the lives of people around the world.</p>" +

            "<p>Here is some information about the student programs we run at the school:</p><ul>" +

            "<li>Learning at the ASMS</li>" +
            "<li>Curriculum framework of the ASMS</li>"+
            "<li>Central studies programs of the ASMS</li>"+
            
            "</ul><p>Students of today must be prepared, willing and able to engage in and further develop the emerging learning in the new sciences, and to link this learning with the social and ethical issues that are important to the development of a fair and sustainable society for the future.</p>" +

            "<p>The ASMS is building science curriculum for senior secondary students that specifically connects with the emerging learning of the new sciences.  In particular, the partnership of the ASMS with Flinders University is developing programs in emerging areas such as nanotechnology, aquaculture, biotechnology, laser science and communication technologies.</p>" +

            "<p>ASMS students and teachers work alongside university professionals and industry researchers to develop curriculum that is linked to the latest developments in the field.  The involvement of such experts provides leading edge connections with the curriculum of the school.  Students at the ASMS have the opportunity to work alongside world leading experts in their work.</p>" +

            "<p>Teaching and learning in the new sciences at the ASMS will ensure that students at the school develop a sound knowledge and understanding of science in the traditional disciplines of biology, chemistry, physics and geology as well as deep insights into the rapidly emerging understandings of the new sciences.</p>",

            // Position #4
            "<p>The ASMS opened in 2003. Through its partnership with Flinders University, the ASMS is responsible for leadership of reform of science and mathematics education across South Australia. The school, located on the campus of Flinders University, operates in an innovative building that was recognised by the OECD in 2006 as a model for school design for the 21st century.</p>" +

            "<p>In 2003, the school had an initial enrolment of 165 students in years 10 and 11. Since 2004, the school has also offered a full range of programs to students in year 12. Students enrolled at the ASMS come from all areas of SA and from a diversity of cultural, academic and socio-economic backgrounds.</p>" +

            "<p>Students entering the ASMS do so because of their interest in science and mathematics. The ASMS is not an academically selective school. It is proving to be a school that generates academic success and a school that fosters fulfilment of potential for all its students.</p>" +

            "<p>The ASMS has developed an innovative and comprehensive, interdisciplinary curriculum with science and mathematics as the central disciplinary pillars. The school’s partnership with Flinders University has been the vehicle for the inclusion of leading edge science and mathematics into the curriculum and learning opportunities for students. ASMS students are engaging with science from areas such as nanotechnology, biotechnology, forensic science, satellite mathematics and photonics. In an endeavour to embody the new sciences which are at the heart of the new economy, the curriculum has also been shaped by the applications of science and mathematics in industry.</p>" +

            "<p>The reforming developments occurring at the ASMS are beginning to reach other schools and teachers through the school’s professional development and outreach programs. Significant numbers of educators from other schools engage with a range of professional learning programs conducted by the ASMS, including workshops on “new sciences” and action learning processes. The ASMS hosts multiple workshops, seminars and conferences for teachers of science and mathematics, often in collaboration with their professional associations.</p>" +

            "<p>The ASMS, as an innovative and reforming model of schooling, is attracting significant national and international attention from leading educators. Many Australian and international educators visit the ASMS and its work is featured at international education conferences and forums. It is highly regarded as an internationally recognised model of leading-edge “schooling” and its practice is influencing the design, development and transformation of schools in many countries.</p>" +

            "<p>ASMS staff have participated in a significant number of international professional development programs, often making presentations and publishing their work. ASMS students participate in international science fairs and international students enrolments continue to grow.</p>" +

            "<p>The ASMS is now a leading school in the international network of specialist science and mathematics schools."
        ];

        var staticItems = [
            {
                group: staticGroups[0],
                title: "ASMS Ground Floor",
                author: "An annotated map of the ASMS ground floor",
                date: "18 Sep 2013",
                content: "<img src='/images/maps/groundmap.png' />",
                thumbnailImage: "/images/thumbnails/spi_board.jpg"
            },
            {
                group: staticGroups[0],
                title: "ASMS First Floor",
                author: "An annotated map of the ASMS first floor",
                date: "18 Sep 2013",
                content: "<img src='/images/maps/firstmap.png' />",
                thumbnailImage: "/images/thumbnails/spi_speaker.jpg"
            },
            {
                group: staticGroups[0],
                title: "Sturt Buildings",
                author: "A map of the Sturt buildings",
                date: "18 Sep 2013",
                content: "<img src='/images/maps/sturtmap.png' />",
                thumbnailImage: "/images/thumbnails/lab_coats.jpg"
            },
            {
                group: staticGroups[1],
                title: "ASMS Public Website",
                author: "Australian Science and Mathematics School",
                date: "18 Sep 2013",
                content: "<a href='http://www.asms.sa.edu.au'>Follow this link to the public website</a>",
                thumbnailImage: "/images/thumbnails/computer_explain.jpg"
            },
            {
                group: staticGroups[1],
                title: "ASMS Portal",
                author: "Australian Science and Mathematics School",
                date: "18 Sep 2013",
                content: "<a href='http://portal.asms.sa.edu.au'>Follow this link to the Portal</a>",
                thumbnailImage: "/images/thumbnails/nano_expo.jpg"
            },
            {
                group: staticGroups[2],
                title: "Our Story",
                author: "Australian Science and Mathematics School",
                date: "29 Oct 2013",
                content: staticContent[4],
                thumbnailImage: "/images/thumbnails/food.jpg"
            },
            {
                group: staticGroups[2],
                title: "Our Goals",
                author: "Australian Science and Mathematics School",
                date: "29 Oct 2013",
                content: staticContent[3],
                thumbnailImage: "/images/thumbnails/computer_pair.jpg"
            },
            {
                group: staticGroups[2],
                title: "Our Future",
                author: "Australian Science and Mathematics School",
                date: "29 Oct 2013",
                content: staticContent[1],
                thumbnailImage: "/images/thumbnails/aviation.jpg"
            },
            {
                group: staticGroups[2],
                title: "Frequently Asked Questions",
                author: "Australian Science and Mathematics School",
                date: "29 Oct 2013",
                content: staticContent[0],
                thumbnailImage: "/images/thumbnails/soldering.jpg"
            },
        ];

        return staticItems;
    }

    // This function is not currently used because I can't figure out how to organize galleries. #BlizzardSoon
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