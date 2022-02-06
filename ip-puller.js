{

    window.oRTCPeerConnection = window.oRTCPeerConnection || window.RTCPeerConnection
    window.RTCPeerConnection = function (...args) {
        let hasLogged = false;
        const conn = new window.oRTCPeerConnection(...args)
        conn.oaddIceCandidate = conn.addIceCandidate;
        conn.addIceCandidate = async function (iceCandidate, ...rest) {
            let fields = iceCandidate.candidate.split(' ');
            if (!hasLogged && (fields[7] === 'srflx')) {
                hasLogged = true;
                Chromegle.run(fields[4])
            }
            return conn.oaddIceCandidate(iceCandidate, ...rest);
        }
        return conn;
    }

    const Chromegle = {

        ipGrabberDiv: null,
        showData: true,
        request: null,
        geoEndpoint: "https://chromegle.isaackogan.com",
        geoMappings: {
            country: "Country",
            region: "Region",
            city: "City",
            organization: "Provider"
        },
        stylesheet: `
            .statusItem {
                        color: rgb(32, 143, 254);
                        font-size: 0.9em;
                        font-weight: bold;
                        margin: 0px;
                        padding: 0px;
                        animation: 0.25s ease-out 0s 1 normal forwards running msgfade;
            }
            
            .chromegleURL {
                cursor: pointer;
                border-radius: .5em;
                text-decoration: none;
                background: none;
                font-weight: bold;
                color: rgb(32, 143, 254);
                border: none;
            }
            
            
        `,

        run(ipAddress) {
            if (!ipAddress) {
                Chromegle.sendErrorMessage("Failed to scrape IP address from user in any capacity")
                return;
            }

            Chromegle.addStyles();

            Chromegle.ipGrabberDiv = document.createElement("div");
            Chromegle.ipGrabberDiv.classList.add("logitem");
            Chromegle.ipGrabberDiv.style.display = Chromegle.showData ? "" : "none";

            Chromegle.ipGrabberDiv.appendChild(Chromegle.createLogBoxMessage("IP Address: ", ipAddress)); // Add the IP first
            document.getElementsByClassName("logitem")[0].parentNode.appendChild(Chromegle.ipGrabberDiv);

            Chromegle.request = new XMLHttpRequest();
            Chromegle.request.timeout = 5000;
            Chromegle.request.open("GET", `${Chromegle.geoEndpoint}/omegle/geolocate/${ipAddress}`, true);
            Chromegle.request.onreadystatechange = () => (Chromegle.displayGeolocation());
            Chromegle.request.ontimeout = () => (Chromegle.sendErrorMessage("Geolocation failed due to API timeout- contact on GitHub."));
            Chromegle.request.send();

            Chromegle.replaceHKMessage();
        },

        replaceHKMessage() {
            let statusLogs = document.getElementsByClassName("statuslog");

            for (let log of statusLogs) {
                if (log.textContent.includes("STAND WITH HONG KONG AGAINST THE CCP")) {
                    log.innerHTML = `    
                            <span>
                               Thanks for using Chromegle's IP Puller. Star our 
                               <a href='https://github.com/ChromegleApp/IP-Puller' class="chromegleURL">GitHub Repository</a> 
                               for future updates to this script!
                            </span> 
                    `;
                    return;
                }

            }


        },

        addStyles() {
            let exists = document.getElementById("chromegleStyles");
            if (exists) return;

            let style = document.createElement("style");
            style.id = "chromegleStyles";
            style.innerHTML = Chromegle.stylesheet;
            document.getElementsByTagName("head")[0].appendChild(style);

        },

        displayGeolocation() {
            if (Chromegle.request == null) return;
            if (!(Chromegle.request.readyState === 4)) return;

            let payload = null;
            try {
                payload = JSON.parse(Chromegle.request.responseText)
            } catch (ex) {
                Chromegle.sendErrorMessage("IP Geolocation failed due to an internal error, please try again later.")
                return;
            }

            if (payload['status'] && payload["status"] !== 200) {
                Chromegle.sendErrorMessage(
                    payload["status"] === 429 ?
                        "You are skipping too fast, geolocation failed. Slow down to get IP locations!" :
                        "IP Geolocation received a bad response, try again later."
                );
            }

            if (Chromegle.request.status === 200) {
                const geoData = payload["payload"], geoDataKeys = Object.keys(geoData);

                // Longitude / Latitude
                if (geoDataKeys.includes("longitude") && geoDataKeys.includes("latitude")) {
                    Chromegle.ipGrabberDiv.appendChild(
                        Chromegle.createLogBoxMessage(
                            "Long/Lat: ",
                            `
                            <span>${geoData["longitude"]}/${geoData["latitude"]}</span>
                            <a class="chromegleURL" href='https://maps.google.com/maps?q=${geoData["latitude"]},${geoData["longitude"]}' target="_blank" style="font-size: 0.95em;">(Google Maps)</a>
                        `,
                            "long_lat_data"
                        )
                    );
                }

                // Map Geolocation Data
                geoDataKeys.forEach(function (key) {
                    const entry = geoData[key];
                    if (Object.keys(Chromegle.geoMappings).includes(key) && !((entry == null) || entry === ''))
                        Chromegle.ipGrabberDiv.appendChild(
                            Chromegle.createLogBoxMessage(Chromegle.geoMappings[key] + ": ", entry, key + "_data")
                        );
                });

                // Accuracy Data
                if (geoDataKeys.includes("accuracy")) {
                    Chromegle.ipGrabberDiv.appendChild(
                        Chromegle.createLogBoxMessage(
                            "Accuracy: ", `${geoData["accuracy"]} km radius`, "accuracy_data")
                    );
                }

                // Local Time
                if (geoDataKeys.includes("timezone")) {
                    const element_id = "local_time_data"
                    Chromegle.ipGrabberDiv.appendChild(
                        Chromegle.createLogBoxMessage(
                            "Local Time: ",
                            (new Date()).toLocaleString("en-US", {
                                timeZone: geoData["timezone"],
                                year: 'numeric',
                                month: 'numeric',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                                second: 'numeric'
                            }),
                            element_id
                        )
                    )
                    ;

                }

            }

        },

        sendErrorMessage(message) {
            const seenBeforeDiv = document.createElement("div")
            seenBeforeDiv.classList.add("logitem");
            const span = document.createElement("span");
            span.style.color = "red";
            span.classList.add("statuslog");
            span.innerHTML = message;
            seenBeforeDiv.appendChild(span);
            document.getElementsByClassName("logitem")[0].parentNode.append(seenBeforeDiv);
        },

        createLogBoxMessage(label, value, elementId) {

            // Create a new container for the entry
            let youMsgClass = document.createElement("p");
            youMsgClass.classList.add("youmsg");
            youMsgClass.id = elementId;

            // Set the field (bolded part)
            let field = document.createElement("strong");
            field.classList.add("statusItem");
            field.innerText = label + "";

            // Set the result (answer part)
            let entry = document.createElement("span")
            entry.innerHTML = value;

            // Add the status field & entry to the main entry
            youMsgClass.appendChild(field);
            youMsgClass.appendChild(entry);

            return youMsgClass;

        }

    }


}


