'use strict';

const md5 = require( 'md5' );
const cheerio = require( 'cheerio' );
const sitemapCheck = require( '../utils/sitemap-check' );

let pageModel = {

  // Parse page for links in the content area
  _findContentLinks: function( $ ) {
    var links = [];
    var $body = $( 'body' );
    $body.find( '.o-header' ).remove();
    $body.find( '.o-footer' ).remove();
    $body.find( 'a' ).each( ( i, ele ) => {
      var href = $( ele ).attr( 'href' );
      if ( typeof( href ) !== 'undefined' ) {
        links.push( href );
      } ;
    } );

    return links;
  },

  // Parse page for images in the content area
  _findContentImages: function( $ ) {
    var links = [];
    var $body = $( 'body' );
    $body.find( '.o-header' ).remove();
    $body.find( '.o-footer' ).remove();
    $body.find( 'img' ).each( ( i, ele ) => {
      var href = $( ele ).attr( 'src' );
      if ( typeof( href ) !== 'undefined' ) {
        links.push( href );
      } ;
    } );

    return links;
  },

  // Parse page for meta tags
  _findMetaTags: function( $ ) {
    let meta = [];
    $( 'meta' ).each( ( i, val ) => {
      let tag = '<meta';
      for ( var prop in val.attribs ) {
        tag += ' ' + prop + '="' + val.attribs[prop] +'"'
      }
      tag += '>';
      meta.push( tag );
    } );

    return meta;
  },

  /**
   * Find atomic components.
   * @param {string} url The URL of the page being indexed.
   * @param {string} responseBuffer The HTML buffer contatining page HTML.
   */
  _findAtomicComponents: function( url, responseBuffer ) {
    const SEARCH = /(?:(?:class=")|\s)((?:o|m|a)-[^_"__\s]*)/g;
    const pageHMTL = responseBuffer.toString();
    const prefixLookup = [
      'a-',
      'm-',
      'o-'
    ];
    let matchType = undefined;
    const components = [];
    let match = undefined;
    while ( ( match = SEARCH.exec( pageHMTL ) ) !== null ) {
      match.forEach( function( match, groupIndex ) {
        matchType = match.substr( 0, 2 );
        if ( ( prefixLookup.indexOf( matchType ) > -1 )
            && ( components.indexOf( match ) === -1 ) ) {
          components.push( match );
        }
      } );
    }

    return components;
  },

  /**
   * Determine if page has WordPress content.
   * @param {string} url The URL of the page being indexed.
   * @param {string} responseBuffer The HTML buffer contatining page HTML.
   * @returns {boolean} True if page has WordPress content, false otherwise.
   */
  _hasWordPressContent: function( url, responseBuffer ) {
    // const SEARCH = /<link rel=[\"']stylesheet[\"'] [^>]+wp-(?:content|includes)/g;
    // const pageHMTL = responseBuffer.toString();

    // return SEARCH.test( pageHMTL ) ;
    return responseBuffer.indexOf( 'wp-content' ) > -1;

  },

  /**
   * Storing page hash --- can be used to determine if page has changed.
   * @param {string} url The URL of the page being indexed.
   * @param {string} responseBuffer The HTML buffer contatining page HTML.
   * @returns {string} Hash of page contents.
   */
  _getPageHash: function( url, responseBuffer ) {
    return md5( responseBuffer );
  },

  // Format date for timestamping entries
  _formattedDate: function() {
    let d = new Date();
    function twoChars( string ) {
      if ( string.length < 2 ) {
        string = '0' + string;
      }
      return string;
    }

    let year = d.getFullYear();
    let month = twoChars( ( d.getMonth() + 1 ).toString() );
    let date = twoChars( ( d.getDate() ).toString() );

    let hours = twoChars( d.getHours().toString() );
    let minutes = twoChars( d.getMinutes().toString() );
    let seconds = twoChars( d.getSeconds().toString() );

    return year + '-' + month + '-' + date + ' ' + hours + ':' + minutes + ':' + seconds;
  },

  createPageObject: function( queueItem, responseBuffer ) {
    const stateData = queueItem.stateData;
    const contentType = ( stateData && stateData.contentType ) || '';
    const url = queueItem.url;
    let pageObj = Object.assign( {}, queueItem );
    let $ = cheerio.load( responseBuffer );

    if ( contentType.indexOf( 'text/html' ) > -1 && queueItem.host === crawler.host ) {

      // Find Atomic Components
      pageObj.components = this._findAtomicComponents( url, responseBuffer );

      // Find Wordpress Content
      pageObj.hasWordPressContent =
        this._hasWordPressContent( url, responseBuffer );

      // Find all links in content
      pageObj.contentLinks = this._findContentLinks( $ );

      // Find all images in content
      pageObj.contentImages = this._findContentImages( $ );

      // Find the meta tags
      pageObj.metaTags = this._findMetaTags( $ );

      // Find the title
      pageObj.title = $( 'title' ).text();

      // Add the page hash
      pageObj.pageHash = this._getPageHash( url, responseBuffer );

      // Add the sitemap boolean
      pageObj.sitemap = sitemapCheck( queueItem.path ).toString();

      // Add a timestamp
      pageObj.timestamp = this._formattedDate();

      return pageObj;
    }
  }

}

module.exports = pageModel;