# last.fm wiget

a cool widget i made in node.js that generates image from user data!!!!

## meeee
![me](https://last-fm-ruby.vercel.app/?username=Squirre1Z)

## style update!!!! (5/6/25)

I've added styling options to the widget! Here are some examples to show off what it can do:

![1](https://last-fm-ruby.vercel.app/?username=Squirre1Z&bg=0A0E14&cardBg=141C26&primary=FFFFFF&secondary=ADB5BD&accent=00CED1&playing=00CED1&round=20&titleSize=24&artistSize=18)

![2](https://last-fm-ruby.vercel.app/?username=Squirre1Z&bg=240046&cardBg=3C096C&primary=FFFFFF&secondary=E0AAFF&accent=9D4EDD&playing=9D4EDD&recently=FF5E5B&round=24&titleSize=22)

![3](https://last-fm-ruby.vercel.app/?username=Squirre1Z&bg=2B1B47&cardBg=341C4F&primary=F8F9FA&secondary=FF85A1&accent=FF41B4&playing=FF41B4&recently=41EAD4&round=0&titleSize=22)

![4](https://last-fm-ruby.vercel.app/?username=Squirre1Z&bg=191414&cardBg=212121&primary=FFFFFF&secondary=B3B3B3&accent=1DB954&playing=1DB954&recently=E61E32&round=12&width=640&artSize=160)


# Customization Options

you're gonna need to understand what to do to customize so here!!

## Color Customization

change colors

* `bg` - Background color (e.g., `?bg=121212`)
* `cardBg` - Card background color (e.g., `?cardBg=1E1E1E`)
* `primary` - Primary text color for titles (e.g., `?primary=FFFFFF`)
* `secondary` - Secondary text color for artist/album (e.g., `?secondary=B3B3B3`)
* `accent` - Accent color for UI elements (e.g., `?accent=1D8954`)
* `playing` - "Currently Playing" text color (e.g., `?playing=1D8954`)
* `recently` - "Recently Played" text color (e.g., `?recently=FF3333`)

## Theme Presets

use predefined theme

* `theme` - Quick theme selection (e.g., `?theme=dark|light|blue|pink`)

## Font Size Customization

change font

* `usernameSize` - Username font size (e.g., `?usernameSize=14`)
* `statusSize` - Playing status font size (e.g., `?statusSize=16`)
* `titleSize` - Song title font size (e.g., `?titleSize=21`)
* `artistSize` - Artist name font size (e.g., `?artistSize=17`)
* `albumSize` - Album name font size (e.g., `?albumSize=15`)

## Dimension Customization

change dimensions

* `width` - Card width (e.g., `?width=600`)
* `height` - Card height (e.g., `?height=200`)
* `artSize` - Album art size (e.g., `?artSize=150`)

## Layout Customization

hide some stuff

* `hideProfile` - Hide profile section (e.g., `?hideProfile=true`)
* `hideAlbum` - Hide album name (e.g., `?hideAlbum=true`)
* `hideStatus` - Hide playing status (e.g., `?hideStatus=true`)
* `-round` - Corner radius for the card (e.g., `?round=20`)
