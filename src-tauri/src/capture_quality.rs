/// Classify captured bookmark text quality (local heuristics, no AI).

const NOISY_MARKERS: &[&str] = &[
    "to view keyboard shortcuts",
    "view keyboard shortcuts",
    "keyboard shortcuts",
    "home",
    "explore",
    "notifications",
    "messages",
    "grok",
    "bookmarks",
    "profile",
    "relevant people",
    "discover more",
    "trending now",
    "terms of service",
    "privacy policy",
    "post your reply",
    "sourced from across x",
    "creator studio",
    "premium",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QualityAssessment {
    pub quality: String,
    pub warning: Option<String>,
}

pub fn classify_capture(
    captured_text: &Option<String>,
    capture_status: &Option<String>,
) -> QualityAssessment {
    let text = captured_text.as_deref().unwrap_or("").trim();
    let status = capture_status.as_deref().unwrap_or("").to_lowercase();

    if text.is_empty() {
        if status.contains("failed") {
            return QualityAssessment {
                quality: "failed".to_string(),
                warning: Some(
                    "No tweet or page text was captured. Re-open the page and save again with the extension.".to_string(),
                ),
            };
        }
        return QualityAssessment {
            quality: "partial".to_string(),
            warning: Some(
                "Little or no text was captured. You can re-capture from the original page.".to_string(),
            ),
        };
    }

    let lower = text.to_lowercase();
    let mut hits = 0u32;
    for marker in NOISY_MARKERS {
        if lower.contains(marker) {
            hits += 1;
        }
    }

    if hits >= 2 {
        return QualityAssessment {
            quality: "noisy".to_string(),
            warning: Some(
                "This capture may include X sidebar or navigation text. Re-capture from the tweet page for cleaner text.".to_string(),
            ),
        };
    }

    if status.contains("partial") || status.contains("failed") {
        return QualityAssessment {
            quality: "partial".to_string(),
            warning: Some(
                "Capture was incomplete. Re-capture from the original page if the text looks wrong.".to_string(),
            ),
        };
    }

    if text.len() < 12 && status.contains("failed") {
        return QualityAssessment {
            quality: "partial".to_string(),
            warning: Some("Very little text was saved.".to_string()),
        };
    }

    QualityAssessment {
        quality: "clean".to_string(),
        warning: None,
    }
}

pub fn text_improved(existing: &Option<String>, new_text: &Option<String>) -> bool {
    let old_len = existing.as_deref().map(|s| s.trim().len()).unwrap_or(0);
    let new_len = new_text.as_deref().map(|s| s.trim().len()).unwrap_or(0);
    new_len > old_len
}

pub fn is_playable_video_url(url: &str) -> bool {
    let u = url.trim();
    !u.is_empty()
        && !u.starts_with("blob:")
        && (u.contains("video.twimg.com") || u.contains(".mp4"))
}

pub fn is_promo_image_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.contains("card_img")
        || lower.contains("see_what")
        || lower.contains("promo")
        ||     lower.contains("card_image")
        || lower.contains("amplify_video_thumb")
        || lower.contains("/card/")
        || lower.contains("abs.twimg.com/rweb")
        || lower.contains("/og/image.png")
}

pub fn pick_video_url(
    incoming: &Option<String>,
    existing: &Option<String>,
) -> Option<String> {
    let inc = incoming
        .as_deref()
        .filter(|s| is_playable_video_url(s))
        .map(|s| s.to_string());
    let ex = existing
        .as_deref()
        .filter(|s| is_playable_video_url(s))
        .map(|s| s.to_string());

    match (inc, ex) {
        (Some(i), None) => Some(i),
        (None, ex) => ex,
        (Some(i), Some(_)) => Some(i),
    }
}

pub fn pick_poster_image_url(
    incoming: &Option<String>,
    existing: &Option<String>,
    video_url: &Option<String>,
) -> Option<String> {
    let filter = |opt: &Option<String>| {
        opt.as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty() && !is_promo_image_url(s))
            .map(|s| s.to_string())
    };

    let inc = filter(incoming);
    let ex = filter(existing);

    let has_video = video_url
        .as_deref()
        .map(is_playable_video_url)
        .unwrap_or(false);

    if has_video {
        let is_thumb = |u: &str| u.contains("video_thumb");
        if inc.as_ref().map(|u| is_thumb(u)).unwrap_or(false) {
            return inc;
        }
        if ex.as_ref().map(|u| is_thumb(u)).unwrap_or(false) {
            return ex;
        }
        return inc.or(ex);
    }

    inc.or(ex).or_else(|| {
        existing
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty() && !is_promo_image_url(s))
            .map(|s| s.to_string())
    })
}

pub fn video_improved(existing: &Option<String>, incoming: &Option<String>) -> bool {
    let had = existing
        .as_deref()
        .map(is_playable_video_url)
        .unwrap_or(false);
    let has = incoming
        .as_deref()
        .map(is_playable_video_url)
        .unwrap_or(false);
    has && !had
}
