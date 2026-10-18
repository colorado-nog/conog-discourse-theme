import { apiInitializer } from "discourse/lib/api";
import { settings } from "virtual:theme";

// Replaces the logo slot with the CONOG lockup: Snowfield mark on the dark header, the
// CONOG wordmark in Barlow Condensed, and the descriptor in Plex Mono (Blueprint §7.1).
// The descriptor is the header's mono rail (§11.1); CSS hides it on narrow phones.
export default apiInitializer((api) => {
  const markUrl = settings.theme_uploads.mark_snowfield;
  const descriptor = settings.header_descriptor;

  api.renderInOutlet(
    "home-logo-contents",
    <template>
      <span class="conog-lockup">
        <img
          class="conog-lockup__mark"
          src={{markUrl}}
          alt=""
          width="49"
          height="20"
        />
        <span class="conog-lockup__wordmark">CONOG</span>
        {{#if descriptor}}
          <span class="conog-lockup__descriptor">{{descriptor}}</span>
        {{/if}}
      </span>
    </template>
  );
});
