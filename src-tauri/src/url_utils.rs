pub fn get_domain(url: &str) -> String {
    match url::Url::parse(url.trim()) {
        Ok(u) => u
            .host_str()
            .map(|h| h.strip_prefix("www.").unwrap_or(h).to_string())
            .unwrap_or_else(|| url.to_string()),
        Err(_) => url.to_string(),
    }
}

pub fn normalize_url(url: &str) -> String {
    let mut trimmed = url.trim().to_string();
    if trimmed.is_empty() {
        return trimmed;
    }
    if !trimmed.starts_with("http://") && !trimmed.starts_with("https://") {
        trimmed = format!("https://{trimmed}");
    }
    if let Ok(mut parsed) = url::Url::parse(&trimmed) {
        parsed.set_fragment(None);
        return parsed.to_string();
    }
    trimmed
}

pub fn is_tweet_host(host: &str) -> bool {
    let h = host.strip_prefix("www.").unwrap_or(host).to_lowercase();
    h == "x.com" || h == "twitter.com" || h.ends_with(".twitter.com")
}

pub fn is_youtube_host(host: &str) -> bool {
    let h = host.strip_prefix("www.").unwrap_or(host).to_lowercase();
    h == "youtube.com" || h == "youtu.be" || h.ends_with(".youtube.com")
}

pub fn extract_tweet_id(url: &str) -> Option<String> {
    let idx = url.find("/status/")?;
    let rest = &url[idx + "/status/".len()..];
    let id: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    if id.is_empty() {
        None
    } else {
        Some(id)
    }
}

pub fn is_tweet_url(url: &str) -> bool {
    match url::Url::parse(url.trim()) {
        Ok(u) => {
            let host = u.host_str().unwrap_or("");
            is_tweet_host(host) && extract_tweet_id(url).is_some()
        }
        Err(_) => false,
    }
}

pub fn extract_handle_from_tweet_url(url: &str) -> Option<String> {
    let parsed = url::Url::parse(url.trim()).ok()?;
    let path = parsed.path();
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() >= 3 && parts[0] != "i" && parts[1] == "status" {
        return Some(parts[0].to_string());
    }
    if parts.len() >= 2 && parts[1] == "status" {
        return Some(parts[0].to_string());
    }
    None
}

pub fn detect_source(url: &str) -> &'static str {
    match url::Url::parse(url.trim()) {
        Ok(u) => {
            let host = u.host_str().unwrap_or("");
            if is_tweet_host(host) {
                "x"
            } else if is_youtube_host(host) {
                "youtube"
            } else {
                "web"
            }
        }
        Err(_) => "web",
    }
}

pub fn default_bookmark_type(url: &str, source: &str) -> &'static str {
    if source == "x" && is_tweet_url(url) {
        "tweet"
    } else if source == "youtube" {
        "video"
    } else {
        "article"
    }
}
