# Push notifications

This doc describes how to test and develop changes to Zulip's mobile
push notifications.


## General tips

When testing Zulip's push notifications:

* Try simulating a PM conversation between two users: one on the
  mobile device, and one from your desktop.  For example, if you've
  logged in as "Iago" on your mobile device, log in as "Polonius" via
  a web browser, and send a PM from Polonius to Iago.

* Test different types of messages that will cause different types of
  notifications: a 1:1 PM conversation, a group PM conversation, an
  @-mention in a stream, a stream with notifications turned on, even
  an @-mention in a 1:1 or group PM conversation.

* Make sure "mobile push notifications" are on in the mobile user's
  Zulip settings!

  * Try also turning on the "even while online" setting -- this is
    extremely helpful for testing notifications effectively, with
    basically the one exception of if you're specifically working on
    the "if online" aspect of the system.

* Make sure notifications are enabled for Zulip in the device's system
  settings!

  * To get to these, find "Notifications" or "Apps & Notifications" in
    the system settings app, depending on OS and version; then find
    Zulip in the list.  Or on Android, in the launcher give the app's
    icon a long-press -> "App Info" -> "Notifications".

  * Also check the settings there for whether and how the app's
    notifications will pop on the screen, make a sound, etc.

  * Particularly for the debug build on one's personal device, it's
    natural to disable notifications between development sessions to
    suppress duplicates... then forget to re-enable them.

* Leave the app in the background: that is, switch to the launcher /
  home screen or to a different app to get it off the screen.  Or
  keep it on screen, or force-kill it, to test different scenarios!


## Testing server-side changes (iOS or Android)

When making changes to the Zulip server, use these steps to test how
they affect notifications.

First, three one-time setup steps:

1. [Set up the dev server for mobile development](dev-server.md).

2. Add the following line to `zproject/dev_settings.py`:

   ```python
   PUSH_NOTIFICATION_BOUNCER_URL = 'https://push.zulipchat.com'
   ```

   This matches the default setting for a production install of the
   Zulip server (generated from `zproject/prod_settings_template.py`.)

   You can keep this around via `git stash`.

3. Register your development server with our production bouncer by
   running the following command:

   ```
   python manage.py register_server --agree_to_terms_of_service
   ```

   This is a variation of our [instructions for production
   deployments](https://zulip.readthedocs.io/en/latest/production/mobile-push-notifications.html),
   adapted for the Zulip dev environment.

   You should only have to do this step once, unless you build a new
   Zulip server dev environment from scratch.  The credentials which
   this command registers with the bouncer are kept in the
   `zproject/dev-secrets.conf` file.

   If you were already running `tools/run-dev.py`, quit and restart it
   after these setup steps.


Then, each time you test:

1. Run `tools/run-dev.py` according to the instructions in
   [dev-server.md](dev-server.md).  Then follow that doc's
   instructions to log into the dev server.  Use the release build of
   the app -- that is, the Zulip app installed from the App Store or
   Play Store.

2. Follow the general tips above to cause a push notification.  For
   example, log in from a browser as a different user, and send the
   mobile user a PM.

   You should see a push notification appear on the mobile device!

   If you don't, check the general tips above.  Then ask in chat and
   let's debug.


## Testing client-side changes on Android

Happily, this is straightforward: just edit, build, and run the app
the same as for any other change.

Typically you'll be editing Java code (not only JS), so remember to
rerun `react-native run-android`.

### Debugging tips (for Android client)

First: see our general [debugging tips for platform-native
code](debugging.md#native), particularly `adb logcat`.

Our notifications code tags log messages with the tag `ZulipNotif`.
So a command like `adb logcat ZulipNotif:V *:E` is helpful for seeing
details about Zulip notifications.  For example (edited slightly for
readability):

```
$ adb logcat -T 1000 ZulipNotif:V *:E
V ZulipNotif: getPushNotification: Bundle[{sender_full_name=Greg 試し, pm_users=101712,101713,108224,
    sender_avatar_url=https://secure.gravatar.com/avatar/39da3be46238cf93b47a1f5af3df993f?d=identicon&version=1,
    server=zulipchat.com, realm_uri=https://kandra-test.zulipchat.com, realm_id=1230, content_truncated=false,
    zulip_message_id=157914854, recipient_type=private, time=1549686858, user=greg+t2@zulipchat.com,
    sender_id=101712, alert=New private group message from Greg 試し, event=message, content=C,
    sender_email=greg+t1@zulipchat.com}]
V ZulipNotif: java.lang.Throwable
V ZulipNotif: 	at com.zulipmobile.notifications.FCMPushNotifications.logNotificationData(FCMPushNotifications.java:61)
V ZulipNotif: 	at com.zulipmobile.notifications.FCMPushNotifications.onReceived(FCMPushNotifications.java:70)
V ZulipNotif: 	at com.zulipmobile.notifications.FcmListenerService.onMessageReceived(FcmListenerService.java:18)
V ZulipNotif: 	at com.google.firebase.messaging.FirebaseMessagingService.zzd(Unknown Source:60)
V ZulipNotif: 	at com.google.firebase.iid.zzg.run(Unknown Source:4)
V ZulipNotif: 	at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1167)
V ZulipNotif: 	at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:641)
V ZulipNotif: 	at com.google.android.gms.common.util.concurrent.zza.run(Unknown Source:6)
V ZulipNotif: 	at java.lang.Thread.run(Thread.java:764)
```

The spew in this example is from this line in our code:
```
    Log.v(TAG, "getPushNotification: " + data.toString(), new Throwable());
```
(The stack trace is just for information; it doesn't represent an
error.)

You can do print-debugging by adding similar lines, even if they don't
make it into the final code you send in a PR.  Here's another example:
```
    Log.v(TAG, String.format("update: %d", conversations.size()));
```


## Testing client-side changes on iOS

Apple makes this much more of a pain than it is on Android: APNs (*)
does not allow our production bouncer to send notifications to a
development build of the app.

(*) i.e. "Apple Push Notification service" -- Apple is very Apple
about this name, styling it without an article and with the
idiosyncratic capitalization shown.


### Current workaround

Make a release build of the app, and upload it [as an alpha][].
Update your device to the alpha from TestFlight, and test there.

[as an alpha]: release.md#build-and-upload-alpha-ios

This works OK, but it's slow: about 5m to build and upload, and
another few on Apple's servers before it's available in alpha.  In
total perhaps 10m from "save and hit go" to actually getting to test.

The long iteration cycle can be tolerable for changes that are very
likely to need only zero to one revision -- because they're very
small, or already well tested on Android -- but makes serious
development basically infeasible.


#### Tip: setting the iOS build number

For making a throwaway alpha build like this approach calls for, you
may find something like the following command helpful.  It sets the
[iOS build number][] (which we normally leave set to 1) to a new value
so the new build can coexist on TestFlight with previous builds:

    $ set-buildno () {
        version="$1" perl -i -0pe '
	    s|<key>CFBundleVersion</key> \s* <string>\K [0-9.]+
	     |$ENV{version}|xs
	  ' ios/ZulipMobile/Info.plist &&
	git commit -am "version: Bump iOS build number to $1."
      }
    $ set-buildno 2

This is similar to the job of `tools/bump-version`, which operates on
the user-facing [version number][].

[iOS build number]: https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleversion
[version number]: https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleshortversionstring


### Possible future solution

We believe that given an appropriate dev certificate, it should be
possible to send notifications to a dev build of the app through
Apple's sandbox instance of APNs.

Open questions include how to teach the Zulip server and/or bouncer to
talk to the sandbox APNs.

* A good first step would be to do so from a development server,
  without involving the bouncer.

* To make the development experience as good as it is on Android,
  though, it should be possible to get notifications from
  zulipchat.com and chat.zulip.org in a development build of the app.

* One way to arrange that might be to have the production bouncer talk
  to either the production or staging instance of APNs; the client
  tell the Zulip server which one to use for that client's
  notifications, and the Zulip server pass that information on to the
  bouncer.

* Another might be to leave the bouncer out of it, and have the Zulip
  server talk directly to the sandbox APNs when the client asks it to,
  rather than talk to the bouncer.
